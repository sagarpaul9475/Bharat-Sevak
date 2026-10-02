const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true, trim: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'piece' },
  stock: { type: Number, default: 0, min: 0 },
  image: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: String
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
