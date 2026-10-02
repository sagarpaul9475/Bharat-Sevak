const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  kind: { type: String, enum: ['product', 'service'], required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
