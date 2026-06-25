const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, required: true, trim: true, lowercase: true },
  customerPhone: { type: String, required: true, trim: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, max: 1000, default: 1 },
  specialRequirements: { type: String, trim: true, maxlength: 1000 },
  preferredDeadline: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'rejected'],
    default: 'pending'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedWorkerName: { type: String, default: null },
  assignedWorkerPhone: { type: String, default: null },
  estimatedCost: { type: Number, required: true, min: 0 },
  finalCost: { type: Number, default: null, min: 0 },
  paid: { type: Boolean, default: false },
  // File upload for photocopy / printing services
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileOriginalName: { type: String, default: null },
  fileDownloaded: { type: Boolean, default: false },
  // Removed manual createdAt — handled by timestamps:true below (Issue #18)
  acceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  internalNotes: { type: String, trim: true, maxlength: 2000 },
  customerFeedback: { type: String, trim: true, maxlength: 500 },
  rating: { type: Number, min: 1, max: 5, default: null }
}, {
  timestamps: true  // auto-creates createdAt and updatedAt cleanly (Issue #18)
});

// Index for common queries
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ assignedTo: 1, status: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ status: 1, completedAt: -1 }); // Analytics — completed bookings by date
bookingSchema.index({ assignedTo: 1, status: 1, completedAt: -1 }); // Worker analytics
bookingSchema.index({ assignedTo: 1, rating: 1 }); // Worker rating aggregation
bookingSchema.index({ createdAt: -1 }); // General date-range queries
bookingSchema.index({ serviceName: 1, status: 1 }); // Popular services aggregation

module.exports = mongoose.model('Booking', bookingSchema);
