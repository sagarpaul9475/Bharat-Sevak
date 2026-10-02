const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true, trim: true },
  description: String,
  rate: { type: Number, required: true, min: 0 },
  rateUnit: { type: String, default: 'job' },
  area: String,
  available: { type: Boolean, default: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
