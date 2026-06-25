const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { body, param, validationResult } = require('express-validator');
const { Types } = require('mongoose');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const createRazorpayOrder = async (booking) => {
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    const error = new Error('Online payment is not configured');
    error.status = 503;
    throw error;
  }

  return razorpay.orders.create({
    amount: Math.round(booking.estimatedCost * 100),
    currency: 'INR',
    receipt: `booking_${booking._id}`,
    notes: {
      bookingId: booking._id.toString(),
      serviceName: booking.serviceName
    }
  });
};

// Multer config — PDF only, 10MB max
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'bookings'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'booking-' + unique + path.extname(file.originalname));
  }
});

// Validate PDF by checking magic bytes (0x25 0x50 0x44 0x46 = "%PDF")
const validatePdfMagicBytes = (filePath) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  } catch {
    return false;
  }
};

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const getUploadedFiles = (req) => {
  if (Array.isArray(req.files)) return req.files;
  return [
    ...(req.files?.files || []),
    ...(req.files?.file || [])
  ];
};

const getBookingFiles = (booking) => {
  if (booking.files?.length) return booking.files;
  if (!booking.fileUrl) return [];
  return [{
    url: booking.fileUrl,
    name: booking.fileName || path.basename(booking.fileUrl),
    originalName: booking.fileOriginalName || 'document.pdf',
    downloaded: booking.fileDownloaded
  }];
};

const cleanupUploadedFiles = (files = []) => {
  files.forEach(file => fs.unlink(file.path, () => {}));
};

// Validation helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /bookings/payment-config — lets the frontend safely enable online payment
router.get('/payment-config', authenticate, (req, res) => {
  res.json({
    onlinePaymentAvailable: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    provider: 'razorpay'
  });
});

// POST /bookings — requires auth; handles optional file upload (Issue #28)
router.post('/', authenticate, upload.fields([
  { name: 'files', maxCount: 5 },
  { name: 'file', maxCount: 1 }
]), [
  body('customerName').trim().notEmpty().withMessage('Name is required'),
  body('customerEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('customerPhone')
    .trim().notEmpty().withMessage('Phone is required')
    .matches(/^[+\d\s\-()]{7,15}$/).withMessage('Invalid phone number'),
  body('serviceId').custom(v => Types.ObjectId.isValid(v)).withMessage('Invalid service ID'),
  body('quantity').custom(v => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 1000;
  }).withMessage('Quantity must be between 1 and 1000'),
  body('paymentMethod')
    .optional()
    .isIn(['online', 'pay_on_delivery'])
    .withMessage('Select a valid payment method'),
  body('specialRequirements').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Max 1000 chars'),
], validate, async (req, res) => {
  try {
    const {
      customerName, customerEmail, customerPhone, serviceId, quantity,
      specialRequirements, preferredDeadline, paymentMethod = 'pay_on_delivery'
    } = req.body;
    const uploadedFiles = getUploadedFiles(req);

    if (paymentMethod === 'online' && !getRazorpayClient()) {
      cleanupUploadedFiles(uploadedFiles);
      return res.status(503).json({ message: 'Online payment is temporarily unavailable. Please choose Pay on delivery.' });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) return res.status(404).json({ message: 'Service not found or inactive' });

    // Always calculate cost server-side — never trust client (Issue #17)
    const qty = parseInt(quantity, 10);
    const estimatedCost = service.basePrice * qty;

    // Validate preferredDeadline is in the future and within 7 days
    let deadline = null;
    if (preferredDeadline) {
      deadline = new Date(preferredDeadline);
      const now = new Date();
      const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (deadline < now) return res.status(400).json({ message: 'Deadline must be in the future' });
      if (deadline > maxDate) return res.status(400).json({ message: 'Deadline cannot be more than 7 days from now' });
    }

    const bookingData = {
      customerId: req.user._id,
      customerName,
      customerEmail,
      customerPhone,
      serviceId,
      serviceName: service.name,
      quantity: qty,
      specialRequirements,
      preferredDeadline: deadline,
      estimatedCost,
      paymentMethod,
      paymentStatus: paymentMethod === 'online' ? 'pending' : 'pay_on_delivery',
      status: paymentMethod === 'online' ? 'awaiting_payment' : 'pending'
    };

    if (uploadedFiles.length > 5) {
      cleanupUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'You can upload up to 5 PDF files per booking' });
    }

    // Validate PDF magic bytes if files were uploaded
    if (uploadedFiles.length > 0) {
      for (const uploadedFile of uploadedFiles) {
        if (!validatePdfMagicBytes(uploadedFile.path)) {
          cleanupUploadedFiles(uploadedFiles);
          return res.status(400).json({ message: 'Invalid PDF file - file content does not match PDF format' });
        }
      }

      bookingData.files = uploadedFiles.map(uploadedFile => ({
        url: `/uploads/bookings/${uploadedFile.filename}`,
        name: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        downloaded: false
      }));
      bookingData.fileUrl = bookingData.files[0].url;
      bookingData.fileName = bookingData.files[0].name;
      bookingData.fileOriginalName = bookingData.files[0].originalName;
    }

    // Photocopy and printing services require a PDF upload
    if (['photocopy', 'printing'].includes(service.category) && uploadedFiles.length === 0) {
      return res.status(400).json({ message: 'A PDF file is required for photocopy and printing services' });
    }

    const booking = new Booking(bookingData);
    await booking.save();

    if (paymentMethod === 'online') {
      try {
        const order = await createRazorpayOrder(booking);
        booking.razorpayOrderId = order.id;
        await booking.save();
        return res.status(201).json({
          booking,
          payment: {
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
          }
        });
      } catch (paymentError) {
        await Booking.findByIdAndDelete(booking._id);
        cleanupUploadedFiles(uploadedFiles);
        return res.status(paymentError.status || 502).json({
          message: paymentError.status === 503
            ? paymentError.message
            : 'Could not start online payment. Please try again or choose Pay on delivery.'
        });
      }
    }

    res.status(201).json({ booking });
  } catch (err) {
    console.error('Booking creation error:', err);
    // Clean up uploaded files if booking failed
    cleanupUploadedFiles(getUploadedFiles(req));
    res.status(500).json({ message: 'Server error creating booking' });
  }
});

// POST /bookings/:id/payment-order — return an existing order or create one for retry
router.post('/:id/payment-order', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the booking customer can make this payment' });
    }
    if (booking.paymentMethod !== 'online') {
      return res.status(400).json({ message: 'This booking uses Pay on delivery' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This booking is already paid' });
    }

    let orderId = booking.razorpayOrderId;
    let amount = Math.round(booking.estimatedCost * 100);
    let currency = 'INR';
    if (!orderId) {
      const order = await createRazorpayOrder(booking);
      orderId = order.id;
      amount = order.amount;
      currency = order.currency;
      booking.razorpayOrderId = orderId;
      await booking.save();
    }

    res.json({
      booking,
      payment: { keyId: process.env.RAZORPAY_KEY_ID, orderId, amount, currency }
    });
  } catch (err) {
    res.status(err.status || 502).json({ message: err.message || 'Could not start online payment' });
  }
});

// POST /bookings/:id/verify-payment — verify Razorpay HMAC before activating booking
router.post('/:id/verify-payment', authenticate, [
  body('razorpay_payment_id').trim().notEmpty().withMessage('Payment ID is required'),
  body('razorpay_order_id').trim().notEmpty().withMessage('Order ID is required'),
  body('razorpay_signature').trim().notEmpty().withMessage('Payment signature is required')
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the booking customer can verify this payment' });
    }
    if (booking.paymentStatus === 'paid') return res.json(booking);

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!process.env.RAZORPAY_KEY_SECRET || razorpay_order_id !== booking.razorpayOrderId) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${booking.razorpayOrderId}|${razorpay_payment_id}`)
      .digest('hex');
    const supplied = Buffer.from(razorpay_signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      booking.paymentStatus = 'failed';
      await booking.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    booking.razorpayPaymentId = razorpay_payment_id;
    booking.paymentStatus = 'paid';
    booking.paid = true;
    booking.paidAt = new Date();
    booking.status = 'pending';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error verifying payment' });
  }
});

// GET /bookings/customer/:customerId — auth required; customer can only see own bookings (Issue #5)
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.customerId)) {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }
    if (req.user.role === 'customer' && req.user._id.toString() !== req.params.customerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const bookings = await Booking.find({ customerId: req.params.customerId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
});

// GET /bookings/all — owner only, all recent bookings
router.get('/all', authenticate, authorize('owner'), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching all bookings' });
  }
});

// GET /bookings/pending — worker/owner only
router.get('/pending', authenticate, authorize('worker', 'owner'), async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching pending bookings' });
  }
});

// GET /bookings/worker/:workerId — worker can only see own tasks
router.get('/worker/:workerId', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.workerId)) {
      return res.status(400).json({ message: 'Invalid worker ID' });
    }
    if (req.user.role === 'worker' && req.user._id.toString() !== req.params.workerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const bookings = await Booking.find({ assignedTo: req.params.workerId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching worker tasks' });
  }
});

// GET /bookings/:id — auth required; only the booking's customer, assigned worker, or owner (Issue #4)
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id).populate('serviceId', 'name basePrice priceUnit');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = req.user.role === 'owner';
    const isCustomer = booking.customerId?.toString() === req.user._id.toString();
    const isAssignedWorker = booking.assignedTo?.toString() === req.user._id.toString();
    
    // Workers can view if it's assigned to them, OR if it's still pending (to accept/reject it)
    const canWorkerSee = req.user.role === 'worker' && (booking.status === 'pending' || isAssignedWorker);

    if (!isOwner && !isCustomer && !canWorkerSee) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching booking' });
  }
});

// GET /bookings/:id/file — download attached PDF (worker/owner/customer of booking only)
router.get('/:id/file/:fileIndex?', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const bookingFiles = getBookingFiles(booking);
    if (bookingFiles.length === 0) return res.status(404).json({ message: 'No file attached to this booking' });

    const fileIndex = req.params.fileIndex === undefined ? 0 : Number(req.params.fileIndex);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex >= bookingFiles.length) {
      return res.status(404).json({ message: 'File not found for this booking' });
    }
    const selectedFile = bookingFiles[fileIndex];

    const isOwner = req.user.role === 'owner';
    const isCustomer = booking.customerId?.toString() === req.user._id.toString();
    const isAssignedWorker = booking.assignedTo?.toString() === req.user._id.toString();
    
    // Workers can download the file if it's assigned to them, OR if it's pending
    const canWorkerDownload = req.user.role === 'worker' && (booking.status === 'pending' || isAssignedWorker);

    if (!isOwner && !isCustomer && !canWorkerDownload) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resolve the file path and prevent path traversal (Security)
    const uploadsBase = path.resolve(__dirname, '..', 'uploads', 'bookings');
    const filePath = path.resolve(__dirname, '..', selectedFile.url.replace(/^\//, ''));
    if (!filePath.startsWith(uploadsBase)) {
      return res.status(403).json({ message: 'Invalid file path' });
    }

    // Track that the assigned worker has downloaded the file
    if (isAssignedWorker && !selectedFile.downloaded) {
      if (booking.files?.length) {
        booking.files[fileIndex].downloaded = true;
        booking.fileDownloaded = booking.files.every(file => file.downloaded);
      } else {
        booking.fileDownloaded = true;
      }
      await booking.save();
    }

    res.download(filePath, selectedFile.originalName || 'document.pdf');
  } catch (err) {
    res.status(500).json({ message: 'Server error downloading file' });
  }
});

// PATCH /bookings/:id/accept — atomic update prevents race condition (Issue #12)
router.patch('/:id/accept', authenticate, authorize('worker', 'owner'), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status: 'accepted',
          assignedTo: req.user._id,
          assignedWorkerName: req.user.name,
          assignedWorkerPhone: req.user.phone,
          acceptedAt: new Date()
        }
      },
      { new: true }
    );
    if (!booking) {
      return res.status(409).json({ message: 'Booking is no longer pending — may have been accepted by another worker' });
    }
    await User.findByIdAndUpdate(req.user._id, { 
      $addToSet: { assignedTasks: booking._id },
      $inc: { acceptedTasks: 1 } 
    });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error accepting booking' });
  }
});

// PATCH /bookings/:id/reject — atomic update to reject a pending booking
router.patch('/:id/reject', authenticate, authorize('worker', 'owner'), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          assignedTo: req.user._id,
          assignedWorkerName: req.user.name,
          assignedWorkerPhone: req.user.phone
        }
      },
      { new: true }
    );
    if (!booking) {
      return res.status(409).json({ message: 'Booking is no longer pending — may have been handled by another worker' });
    }
    await User.findByIdAndUpdate(req.user._id, { $inc: { rejectedTasks: 1 } });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error rejecting booking' });
  }
});

// PATCH /bookings/:id/status — update status with valid transitions
router.patch('/:id/status', authenticate, authorize('worker', 'owner'), [
  body('status').isIn(['in_progress', 'completed', 'rejected']).withMessage('Invalid status'),
  body('pickupSlots').optional().isArray({ max: 6 }).withMessage('Pickup slots must be a list of up to 6 dates'),
  body('pickupSlots.*.date').optional().isISO8601().withMessage('Each pickup slot must have a valid date and time'),
  body('pickupSlots.*.note').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Pickup note must be 300 characters or less'),
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const { status, pickupSlots = [] } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role === 'worker' && booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }

    const validTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['in_progress'],
      in_progress: ['completed']
    };

    if (validTransitions[booking.status] && !validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ message: `Cannot transition from '${booking.status}' to '${status}'` });
    }

    // If marking as completed and files are attached, enforce that all were downloaded first
    const bookingFiles = getBookingFiles(booking);
    const allFilesDownloaded = bookingFiles.length === 0 || bookingFiles.every(file => file.downloaded);
    if (status === 'completed' && bookingFiles.length > 0 && !allFilesDownloaded) {
      return res.status(400).json({ message: 'You must download all attached PDFs before marking this task as complete' });
    }

    booking.status = status;
    if (status === 'completed') {
      const uniqueSlots = new Map();
      pickupSlots.forEach(slot => {
        const date = new Date(slot.date);
        uniqueSlots.set(date.toISOString(), { date, note: String(slot.note || '').trim() });
      });
      const normalizedSlots = [...uniqueSlots.values()].sort((a, b) => a.date - b.date);
      if (normalizedSlots.some(slot => slot.date <= new Date())) {
        return res.status(400).json({ message: 'Pickup dates and times must be in the future' });
      }
      booking.pickupSlots = normalizedSlots;
      booking.selectedPickupSlot = null;
      booking.pickupSelectedAt = null;
      booking.pickupSelectionSeenAt = null;
      booking.completedAt = new Date();
      await User.findByIdAndUpdate(booking.assignedTo, {
        $inc: { completedTasks: 1 },
        $pull: { assignedTasks: booking._id }
      });
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// PATCH /bookings/:id/pickup-slot — customer may optionally select one offered slot
router.patch('/:id/pickup-slot', authenticate, [
  body('pickupSlot').optional({ nullable: true }).isISO8601().withMessage('Select a valid pickup date and time')
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the booking customer can select a pickup time' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Pickup time can only be selected for completed work' });
    }

    const { pickupSlot } = req.body;
    if (!pickupSlot) {
      booking.selectedPickupSlot = null;
      booking.pickupSelectedAt = null;
      booking.pickupSelectionSeenAt = null;
    } else {
      const selected = new Date(pickupSlot);
      const offered = booking.pickupSlots.some(slot => slot.date.getTime() === selected.getTime());
      if (!offered) {
        return res.status(400).json({ message: 'Please select one of the pickup times offered by the worker' });
      }
      booking.selectedPickupSlot = selected;
      booking.pickupSelectedAt = new Date();
      booking.pickupSelectionSeenAt = null;
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error selecting pickup time' });
  }
});

// PATCH /bookings/:id/pickup-selection-seen — assigned worker acknowledges pickup notification
router.patch('/:id/pickup-selection-seen', authenticate, authorize('worker', 'owner'), async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.role === 'worker' && booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }
    if (!booking.selectedPickupSlot) {
      return res.status(400).json({ message: 'No pickup selection to acknowledge' });
    }
    booking.pickupSelectionSeenAt = new Date();
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error acknowledging pickup notification' });
  }
});

// PATCH /bookings/:id/rating — auth required; only the booking's customer can rate (Issue #6)
router.patch('/:id/rating', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Feedback max 500 chars'),
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const { rating, feedback } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the booking customer can submit a rating' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed bookings' });
    }
    if (booking.rating) {
      return res.status(400).json({ message: 'This booking has already been rated' });
    }

    booking.rating = rating;
    booking.customerFeedback = feedback;
    await booking.save();

    if (booking.assignedTo) {
      const workerBookings = await Booking.find({ assignedTo: booking.assignedTo, rating: { $ne: null } });
      const avgRating = workerBookings.reduce((sum, b) => sum + b.rating, 0) / workerBookings.length;
      await User.findByIdAndUpdate(booking.assignedTo, { avgRating: Math.round(avgRating * 10) / 10 });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error submitting rating' });
  }
});

// PATCH /bookings/:id/final-cost — worker/owner only
router.patch('/:id/final-cost', authenticate, authorize('worker', 'owner'), [
  body('finalCost').isFloat({ min: 0 }).withMessage('Final cost must be a non-negative number'),
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const { finalCost } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (req.user.role === 'worker' && booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }
    if (booking.paymentStatus === 'paid' && parseFloat(finalCost) !== booking.estimatedCost) {
      return res.status(400).json({ message: 'The total for an online-paid booking cannot be changed' });
    }
    booking.finalCost = parseFloat(finalCost);
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating cost' });
  }
});

module.exports = router;
