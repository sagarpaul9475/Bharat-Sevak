const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin', 'delivery'], default: 'customer' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active'], default: 'active' },
  profilePic: { type: String, default: '' },
  address: { type: String, default: '' },
  region: {
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    area: { type: String, default: '' },
    pincode: { type: String, trim: true, match: [/^$|^\d{6}$/, 'PIN code must be 6 digits'], default: '' },
  },
  deliveryCoverage: {
    mode: { type: String, enum: ['local', 'cross_city'], default: 'local' },
    pincodes: [{ type: String, trim: true, match: [/^\d{6}$/, 'Each PIN code must be 6 digits'] }],
  },
  // Delivery Partner / Service Technician fields
  deliveryVehicleType: { type: String, enum: ['bike', 'bicycle', 'scooter', 'van', 'on_foot', 'other'], default: 'bike' },
  serviceSpecialization: { type: String, default: '' }, // e.g. "Delivery Partner", "Electrician", "Plumber", "Sweeper"
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    lat: { type: Number, default: 22.5726 },
    lng: { type: Number, default: 88.3639 },
    updatedAt: { type: Date, default: Date.now },
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
  // Bank account details for UPI / direct transfer payments
  bankDetails: {
    accountHolderName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '', uppercase: true, trim: true },
    bankName: { type: String, default: '' },
  },
  // UPI / QR payment details (PhonePe, Google Pay, Paytm, BHIM, etc.)
  upiDetails: {
    upiId: { type: String, default: '', trim: true },   // e.g. shop@okaxis
    upiPhone: { type: String, default: '' },            // Mobile number linked to UPI app
    upiName: { type: String, default: '' },             // Display name shown in UPI apps
  },
  // Dual role: provider can also act as customer
  canActAsCustomer: { type: Boolean, default: false },
  activeRole: { type: String, enum: ['customer', 'provider'], default: 'provider' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
