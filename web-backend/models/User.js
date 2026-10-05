const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active'], default: 'active' },
  profilePic: { type: String, default: '' },
  address: { type: String, default: '' },
  region: {
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    area: { type: String, default: '' },
  },
  // Provider-specific fields
  providerType: { type: String, enum: ['product', 'service', 'both'], default: 'product' },
  businessName: { type: String, default: '' },
  // Set by an admin only after the provider is onboarded and approved by Razorpay Route.
  razorpayRouteAccountId: { type: String, default: '', trim: true },
  razorpayRouteStatus: { type: String, enum: ['not_started', 'pending', 'active', 'restricted'], default: 'not_started' },
  businessDesc: { type: String, default: '' },
  govtIdProof: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  // KYC Documents (Aadhaar, PAN, etc.)
  kycDocs: [{
    filename: String,
    originalName: String,
    docType: { type: String, enum: ['aadhaar', 'pan', 'voter_id', 'passport', 'driving_license', 'other'], default: 'aadhaar' },
    uploadedAt: { type: Date, default: Date.now },
    url: String,
  }],
  // Business Verification Documents (shop photos, trade license, etc.)
  businessDocs: [{
    filename: String,
    originalName: String,
    docType: { type: String, enum: ['shop_photo', 'trade_license', 'gst_certificate', 'fssai', 'rent_agreement', 'other'], default: 'shop_photo' },
    uploadedAt: { type: Date, default: Date.now },
    url: String,
  }],
  // Dual role: provider can also act as customer
  canActAsCustomer: { type: Boolean, default: false },
  activeRole: { type: String, enum: ['customer', 'provider'], default: 'provider' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
