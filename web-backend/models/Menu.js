const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '📁' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null },
  type: { type: String, enum: ['product_category', 'service_type', 'region', 'folder'], default: 'folder' },
  level: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);
