const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, param, validationResult } = require('express-validator');
const { Types } = require('mongoose');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

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

// Validation helper
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /bookings — requires auth; handles optional file upload (Issue #28)
router.post('/', authenticate, upload.single('file'), [
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
  body('specialRequirements').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Max 1000 chars'),
], validate, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, serviceId, quantity, specialRequirements, preferredDeadline } = req.body;

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
      status: 'pending'
    };

    // Validate PDF magic bytes if a file was uploaded
    if (req.file) {
      if (!validatePdfMagicBytes(req.file.path)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ message: 'Invalid PDF file — file content does not match PDF format' });
      }
      bookingData.fileUrl = `/uploads/bookings/${req.file.filename}`;
      bookingData.fileName = req.file.filename;
      bookingData.fileOriginalName = req.file.originalname;
    }

    // Photocopy and printing services require a PDF upload
    if (['photocopy', 'printing'].includes(service.category) && !req.file) {
      return res.status(400).json({ message: 'A PDF file is required for photocopy and printing services' });
    }

    const booking = new Booking(bookingData);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    console.error('Booking creation error:', err);
    // Clean up uploaded file if booking failed
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: 'Server error creating booking' });
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
router.get('/:id/file', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.fileUrl) return res.status(404).json({ message: 'No file attached to this booking' });

    const isOwner = req.user.role === 'owner';
    const isCustomer = booking.customerId?.toString() === req.user._id.toString();
    const isAssignedWorker = booking.assignedTo?.toString() === req.user._id.toString();
    
    // Workers can download the file if it's assigned to them, OR if it's pending
    const canWorkerDownload = req.user.role === 'worker' && (booking.status === 'pending' || isAssignedWorker);

    if (!isOwner && !isCustomer && !canWorkerDownload) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(__dirname, '..', booking.fileUrl);
    res.download(filePath, booking.fileOriginalName || 'document.pdf');
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
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const { status } = req.body;
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

    booking.status = status;
    if (status === 'completed') {
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
    booking.finalCost = parseFloat(finalCost);
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating cost' });
  }
});

module.exports = router;
