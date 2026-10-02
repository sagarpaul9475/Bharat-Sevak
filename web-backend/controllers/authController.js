const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role, name: user.name },
  process.env.JWT_SECRET || 'bharat-sevak-dev-secret',
  { expiresIn: '7d' }
);

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role = 'customer', providerProfile = {} } = req.body;
    if (!['customer', 'provider'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const exists = await User.findOne({ phone });
    if (exists) return res.status(409).json({ message: 'Phone already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, phone, email, password: passwordHash, role,
      status: role === 'provider' ? 'pending' : 'active',
      providerProfile
    });
    res.status(201).json({
      message: role === 'provider' ? 'Provider registered and sent for admin verification' : 'Registration successful',
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role, status: user.status }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.role === 'provider' && user.status !== 'approved') {
      return res.status(403).json({ message: `Provider account is ${user.status}` });
    }
    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role, status: user.status }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
