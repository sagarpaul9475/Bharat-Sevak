const mongoose = require('mongoose');

const adminMessageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  channel: { type: String, enum: ['in_app', 'email', 'both'], required: true },
  audience: { type: String, enum: ['all', 'role', 'user'], required: true },
  recipientRole: { type: String, enum: ['customer', 'provider', 'admin', ''], default: '' },
  recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientCount: { type: Number, default: 0 },
  emailSentCount: { type: Number, default: 0 },
  emailFailedCount: { type: Number, default: 0 },
}, { timestamps: true });

adminMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminMessage', adminMessageSchema);
