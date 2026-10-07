const mongoose = require('mongoose');

const providerQuerySchema = new mongoose.Schema({
  queryId: { type: String, unique: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  details: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['open', 'in_review', 'resolved', 'closed'], default: 'open', index: true },
  adminReply: { type: String, default: '', trim: true, maxlength: 5000 },
  repliedAt: { type: Date, default: null },
  emailSentToAdmin: { type: Boolean, default: false },
  emailSentToProvider: { type: Boolean, default: false },
}, { timestamps: true });

providerQuerySchema.pre('save', async function (next) {
  if (!this.queryId) {
    const count = await mongoose.model('ProviderQuery').countDocuments();
    this.queryId = `PQ-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

providerQuerySchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProviderQuery', providerQuerySchema);
