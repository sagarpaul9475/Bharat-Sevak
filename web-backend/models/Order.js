const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['product', 'service'], required: true },
  item: { type: mongoose.Schema.Types.ObjectId, refPath: 'items.itemType', required: true },
  itemName: { type: String, required: true },
  itemPrice: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  subtotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'out_for_delivery', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['qr', 'cash', 'online'], default: 'cash' },
  txnId: { type: String, default: '' },
  utrNumber: { type: String, default: '' },          // UPI UTR / reference number submitted by customer
  payerPhone: { type: String, default: '' },          // Customer's UPI-linked mobile number
  paymentNote: { type: String, default: '' },         // Optional note by customer
  paymentSubmittedAt: { type: Date },                 // When customer submitted payment proof
  paymentConfirmedAt: { type: Date },                 // When provider confirmed payment
  gatewayOrderId: { type: String, default: '' },
  gatewayPaymentId: { type: String, default: '' },
  platformCommissionPercent: { type: Number, default: 1, min: 0, max: 100 },
  platformCommissionAmount: { type: Number, default: 0, min: 0 },
  providerTransferAmount: { type: Number, default: 0, min: 0 },
  razorpayTransferId: { type: String, default: '' },
  providerPayoutStatus: { type: String, enum: ['not_applicable', 'pending_onboarding', 'pending_configuration', 'pending', 'transferred', 'failed'], default: 'not_applicable' },
  deliveryAddress: { type: String, default: '' },
  orderType: { type: String, enum: ['product', 'service', 'mixed'], default: 'product' },
  // Secure Completion / Delivery OTP
  deliveryOtp: { type: String, default: '' },
  otpVerified: { type: Boolean, default: false },
  otpVerifiedAt: { type: Date },
  // Assignment to Delivery Partner or Field Service Technician
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedRole: { type: String, enum: ['delivery_man', 'technician', 'provider', 'self'], default: 'delivery_man' },
  assignedName: { type: String, default: '' },
  assignedPhone: { type: String, default: '' },
  fulfillmentStatus: {
    type: String,
    enum: ['unassigned', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'unassigned'
  },
  // Geographical locations for live tracking
  pickupLocation: {
    address: { type: String, default: '' },
    lat: { type: Number, default: 22.5726 },
    lng: { type: Number, default: 88.3639 },
  },
  dropoffLocation: {
    address: { type: String, default: '' },
    lat: { type: Number, default: 22.5850 },
    lng: { type: Number, default: 88.3750 },
  },
  liveLocation: {
    lat: { type: Number, default: 22.5726 },
    lng: { type: Number, default: 88.3639 },
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
    isLive: { type: Boolean, default: false },
  },
  locationHistory: [{
    lat: Number,
    lng: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  notes: { type: String, default: '' },
  adminNotified: { type: Boolean, default: false },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String
  }],
}, { timestamps: true });

// Auto-generate orderId and deliveryOtp
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `BS-${String(count + 1).padStart(6, '0')}`;
  }
  if (!this.deliveryOtp) {
    this.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
