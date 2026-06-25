const mongoose = require('mongoose');

const signupVerificationSchema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  phone: { type: String, required: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  emailOtpHash: { type: String, required: true },
  phoneOtpHash: { type: String, required: true },
  attemptsRemaining: { type: Number, default: 5 },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SignupVerification', signupVerificationSchema);
