const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['customer', 'worker', 'owner'], required: true, default: 'customer' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  createdAt: { type: Date, default: Date.now },
  // Worker fields
  assignedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  completedTasks: { type: Number, default: 0 },
  acceptedTasks: { type: Number, default: 0 },
  rejectedTasks: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0, min: 0, max: 5 },
  isActive: { type: Boolean, default: true }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
