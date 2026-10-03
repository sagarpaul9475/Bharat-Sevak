const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  minPrice: { type: Number, default: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null },
  categoryName: { type: String, default: '' },
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
  unit: { type: String, default: 'piece' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'inactive'], default: 'pending' },
  tags: [{ type: String }],
  region: {
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    area: { type: String, default: '' },
  },
  rejectionReason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
