const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SignupVerification = require('../models/SignupVerification');
const {
  isDevOtpMode,
  isScreenOtpMode,
  sendEmailOtp,
  sendWhatsAppOtp
} = require('../services/otpDelivery');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const signupFieldsValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone')
    .trim().notEmpty().withMessage('Phone is required')
    .matches(/^[+\d\s\-()]{7,18}$/).withMessage('Invalid phone number'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
];

const normalizePhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
};

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// Send separate codes to the supplied email address and WhatsApp number.
router.post('/signup/request-otp', signupFieldsValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, password } = req.body;
    const normalizedPhone = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Enter a valid phone number with country code' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone: normalizedPhone }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? 'User already exists with this email'
          : 'User already exists with this phone number'
      });
    }

    // A resend invalidates all older codes for this email or phone.
    await SignupVerification.deleteMany({ $or: [{ email }, { phone: normalizedPhone }] });

    const emailOtp = generateOtp();
    const phoneOtp = generateOtp();
    const challengeId = crypto.randomUUID();
    await SignupVerification.create({
      challengeId,
      name,
      email,
      phone: normalizedPhone,
      passwordHash: await bcrypt.hash(password, 10),
      emailOtpHash: await bcrypt.hash(emailOtp, 10),
      phoneOtpHash: await bcrypt.hash(phoneOtp, 10),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const showOtpsOnScreen = isScreenOtpMode();
    const deliveryResults = await Promise.allSettled([
      sendEmailOtp({ email, name, otp: emailOtp }),
      sendWhatsAppOtp({ phone: normalizedPhone, otp: phoneOtp })
    ]);
    const deliveryErrors = deliveryResults
      .filter(result => result.status === 'rejected')
      .map(result => result.reason?.message || 'Unknown OTP delivery error');

    if (deliveryErrors.length > 0) {
      console.warn('[Signup OTP delivery]', deliveryErrors.join(' | '));
    }

    if (!showOtpsOnScreen && deliveryErrors.length > 0) {
      await SignupVerification.deleteOne({ challengeId });
      return res.status(503).json({
        message: 'Could not send verification codes. Please try again later.'
      });
    }

    res.json({
      challengeId,
      expiresInSeconds: 600,
      message: showOtpsOnScreen
        ? 'Verification codes generated. Enter the codes shown on screen.'
        : 'Verification codes sent to your email and WhatsApp',
      ...(showOtpsOnScreen && { screenOtps: { email: emailOtp, phone: phoneOtp } }),
      ...(isDevOtpMode() && { devOtps: { email: emailOtp, phone: phoneOtp } })
    });
  } catch (err) {
    console.error('[Signup OTP request]', err);
    res.status(500).json({ message: 'Server error while sending verification codes' });
  }
});

// Verify both codes before creating the customer account.
router.post('/signup', [
  ...signupFieldsValidation,
  body('challengeId').isUUID().withMessage('Invalid verification request'),
  body('emailOtp').matches(/^\d{6}$/).withMessage('Enter the 6-digit email code'),
  body('phoneOtp').matches(/^\d{6}$/).withMessage('Enter the 6-digit phone code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, password, challengeId, emailOtp, phoneOtp } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const verification = await SignupVerification.findOne({ challengeId });

    if (!verification || verification.expiresAt <= new Date()) {
      return res.status(400).json({ message: 'Verification codes expired. Please request new codes.' });
    }
    if (verification.attemptsRemaining <= 0) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request new codes.' });
    }
    if (
      verification.email !== email ||
      verification.phone !== normalizedPhone ||
      verification.name !== name
    ) {
      return res.status(400).json({ message: 'Account details changed. Please request new codes.' });
    }

    const [emailMatches, phoneMatches, passwordMatches] = await Promise.all([
      bcrypt.compare(emailOtp, verification.emailOtpHash),
      bcrypt.compare(phoneOtp, verification.phoneOtpHash),
      bcrypt.compare(password, verification.passwordHash)
    ]);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Account details changed. Please request new codes.' });
    }
    if (!emailMatches || !phoneMatches) {
      verification.attemptsRemaining -= 1;
      await verification.save();
      return res.status(400).json({
        message: `Incorrect verification code. ${verification.attemptsRemaining} attempt(s) remaining.`
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone: normalizedPhone }] });
    if (existingUser) {
      await SignupVerification.deleteOne({ challengeId });
      return res.status(400).json({ message: 'An account already exists with this email or phone number' });
    }

    const user = new User({
      name,
      email,
      phone: normalizedPhone,
      password,
      role: 'customer',
      emailVerified: true,
      phoneVerified: true
    });
    await user.save();
    await SignupVerification.deleteOne({ challengeId });

    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[Signup verification]', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

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
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

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

router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
