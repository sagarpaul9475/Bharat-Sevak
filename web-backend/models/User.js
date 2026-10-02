const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active'], default: 'active' },
  providerProfile: {
    serviceTypes: [{ type: String }],
    productTypes: [{ type: String }],
    address: String,
    area: String,
    document: String
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
