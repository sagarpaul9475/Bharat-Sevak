const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { notifyRole } = require('../utils/notifications');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, providerType, businessName, region, deliveryCoverage } = req.body;
    const normalizedRegion = { ...(region || {}) };
    if (normalizedRegion.pincode && !/^\d{6}$/.test(String(normalizedRegion.pincode))) return res.status(400).json({ message: 'PIN code must be exactly 6 digits' });
    const normalizedCoverage = { mode: deliveryCoverage?.mode === 'cross_city' ? 'cross_city' : 'local', pincodes: Array.isArray(deliveryCoverage?.pincodes) ? [...new Set(deliveryCoverage.pincodes.map(String).map(p => p.trim()).filter(Boolean))] : [] };
    if (normalizedCoverage.pincodes.some(p => !/^\d{6}$/.test(p))) return res.status(400).json({ message: 'Every delivery PIN code must be exactly 6 digits' });
    if (normalizedCoverage.mode === 'cross_city' && normalizedCoverage.pincodes.length === 0) return res.status(400).json({ message: 'Add at least one PIN code for cross-city delivery' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const userData = {
      name, email, phone, password: hashed, role: role || 'customer',
      region: normalizedRegion,
      deliveryCoverage: role === 'delivery' ? normalizedCoverage : { mode: 'local', pincodes: [] },
    };
    if (role === 'provider') {
      userData.providerType = providerType || 'product';
      userData.businessName = businessName || name;
      userData.status = 'pending'; // Providers need admin approval
      userData.isVerified = false;
      userData.canActAsCustomer = true; // Dual role
      userData.activeRole = 'provider';
    } else if (role === 'delivery') {
      userData.deliveryVehicleType = req.body.deliveryVehicleType || 'bike';
      userData.serviceSpecialization = req.body.serviceSpecialization || 'Delivery Partner';
      userData.status = 'active';
    }
    const user = await User.create(userData);
    const token = generateToken(user._id);
    const { password: _, ...userObj } = user.toObject();
    if (user.role === 'provider') {
      await notifyRole('admin', {
        title: 'Provider application received',
        message: `${user.businessName || user.name} registered and is awaiting verification.`,
        type: 'verification',
        link: '/admin/approvals',
        metadata: { providerId: String(user._id) },
      });
    }
    res.status(201).json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    if (user.role === 'provider' && user.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Your account has been rejected. Contact admin.' });
    }
    const token = generateToken(user._id);
    const { password: _, ...userObj } = user.toObject();
    res.json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

// Switch active role (provider ↔ customer)
router.put('/switch-role', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'provider' || !user.canActAsCustomer) {
      return res.status(403).json({ message: 'Role switching not available' });
    }
    const newRole = user.activeRole === 'provider' ? 'customer' : 'provider';
    await User.findByIdAndUpdate(user._id, { activeRole: newRole });
    res.json({ activeRole: newRole });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
