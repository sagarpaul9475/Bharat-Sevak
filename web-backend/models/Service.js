const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  serviceType: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null },
  serviceTypeName: { type: String, default: '' },
  rate: { type: Number, required: true },
  rateUnit: { type: String, enum: ['hour', 'day', 'job', 'session', 'month'], default: 'day' },
  location: { type: String, default: '' },
  radius: { type: Number, default: 5 },
  availability: { type: String, default: 'Mon-Sat, 9am-6pm' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'inactive'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  region: {
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    area: { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
