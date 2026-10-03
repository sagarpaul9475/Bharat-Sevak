const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: String, trim: true },
  complaintType: {
    type: String,
    enum: ['delivery_issue', 'product_quality', 'service_quality', 'payment_issue', 'rude_behavior', 'wrong_item', 'not_delivered', 'other'],
    required: true
  },
  subject: { type: String, required: true, trim: true },
  details: { type: String, required: true, trim: true },
  status: { type: String, enum: ['open', 'in_review', 'resolved', 'closed'], default: 'open' },
  adminNote: { type: String },
  emailSentToAdmin: { type: Boolean, default: false },
  emailSentToProvider: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate complaint ID
complaintSchema.pre('save', async function (next) {
  if (!this.complaintId) {
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintId = `CMP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
