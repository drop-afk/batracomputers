const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// POST /auth/signup
// FIXED Issue #2: Role is always forced to 'customer' — no client can self-assign 'worker' or 'owner'
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone')
    .trim().notEmpty().withMessage('Phone is required')
    .matches(/^[+\d\s\-()]{7,15}$/).withMessage('Invalid phone number'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, password } = req.body;

    // Always default to 'customer' — workers/owners are created by admin only (Issue #2)
    const role = 'customer';

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists with this email' });

    const user = new User({ name, email, phone, password, role });
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// POST /auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Prevent deactivated accounts from logging in (Security)
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    // Return user without password (toJSON handles this)
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /auth/me — return only safe fields (Issue #9)
router.get('/me', authenticate, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    isActive: req.user.isActive,
    avgRating: req.user.avgRating,
    completedTasks: req.user.completedTasks,
    createdAt: req.user.createdAt
  });
});

// POST /auth/logout (client-side token removal is primary mechanism)
router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
