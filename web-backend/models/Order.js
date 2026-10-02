const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['product', 'service'], required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  name: String,
  quantity: { type: Number, default: 1, min: 1 },
  price: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: [orderItemSchema], required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'processing', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  payment: {
    method: { type: String, enum: ['cod', 'upi', 'qr'], default: 'cod' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    transactionId: String
  },
  rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
