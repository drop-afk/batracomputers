const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, enum: ['photocopy', 'homework', 'printing', 'tickets', 'other'], required: true },
  basePrice: { type: Number, required: true, min: 0 },
  priceUnit: { type: String, default: 'flat rate', enum: ['per page', 'flat rate', 'per hour', 'per item'] },
  estimatedTime: { type: String, default: '15 mins' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
