const express = require('express');
const { body, validationResult } = require('express-validator');
const { Types } = require('mongoose');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /users/workers — admin only
router.get('/workers', authenticate, authorize('owner'), async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching workers' });
  }
});

// POST /users/workers — admin only; creates worker accounts (Issue #2)
router.post('/workers', authenticate, authorize('owner'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
], validate, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const worker = new User({ name, email, phone, password, role: 'worker' });
    await worker.save();
    res.status(201).json(worker);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating worker' });
  }
});

// GET /users/:id — users can only fetch their own profile; owner can fetch any (Issue #19)
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// PATCH /users/:id — update own profile or any (owner only)
router.patch('/:id', authenticate, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim().matches(/^[+\d\s\-()]{7,15}$/).withMessage('Invalid phone'),
  body('isActive').optional().isBoolean(),
], validate, async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow safe fields — never allow password or role changes here
    const { name, phone, isActive } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    // Only owner can toggle isActive
    if (isActive !== undefined && req.user.role === 'owner') updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating user' });
  }
});

module.exports = router;
