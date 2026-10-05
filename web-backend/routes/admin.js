const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Service = require('../models/Service');
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Region = require('../models/Region');
const bcrypt = require('bcryptjs');
const { verifyToken, requireRole } = require('../middleware/auth');

const adminGuard = [verifyToken, requireRole('admin')];

// ── Dashboard Stats ──────────────────────────────────────────
router.get('/dashboard', adminGuard, async (req, res) => {
  try {
    const [users, providers, customers, products, services, orders, pendingProviders, pendingProducts] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'provider' }),
        User.countDocuments({ role: 'customer' }),
        Product.countDocuments({ status: 'approved' }),
        Service.countDocuments({ status: 'approved' }),
        Order.countDocuments(),
        User.countDocuments({ role: 'provider', status: 'pending' }),
        Product.countDocuments({ status: 'pending' }),
      ]);
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const recentOrders = await Order.find().sort('-createdAt').limit(5)
      .populate('customer', 'name').populate('provider', 'name businessName');
    res.json({ users, providers, customers, products, services, orders, pendingProviders, pendingProducts, revenue: revenue[0]?.total || 0, recentOrders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── User Management ──────────────────────────────────────────
router.get('/users', adminGuard, async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const users = await User.find(filter).select('-password').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await User.countDocuments(filter);
    res.json({ users, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id', adminGuard, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/users/:id', adminGuard, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Provider Approvals ───────────────────────────────────────
router.get('/approvals/providers', adminGuard, async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider', status: 'pending' }).select('-password').sort('-createdAt');
    res.json(providers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/providers/:id/approve', adminGuard, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'provider') return res.status(404).json({ message: 'Provider not found' });
    if (!user.kycDocs?.length || !user.businessDocs?.length) {
      return res.status(400).json({ message: 'Provider must submit both identity/KYC and business verification documents before approval' });
    }
    user.status = 'approved';
    user.isVerified = true;
    await user.save();
    user.password = undefined;
    res.json({ message: 'Provider approved', user });
  } catch (err) { res.status(500).json({ message: 'Could not approve provider' }); }
});

router.put('/approvals/providers/:id/reject', adminGuard, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true }).select('-password');
    res.json({ message: 'Provider rejected', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Product Approvals ────────────────────────────────────────
router.get('/approvals/products', adminGuard, async (req, res) => {
  try {
    const products = await Product.find({ status: 'pending' }).populate('provider', 'name businessName').sort('-createdAt');
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/products/:id/approve', adminGuard, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json({ message: 'Product approved', product: p });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/products/:id/reject', adminGuard, async (req, res) => {
  try {
    const { reason } = req.body;
    const p = await Product.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
    res.json({ message: 'Product rejected', product: p });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Service approvals
router.get('/approvals/services', adminGuard, async (req, res) => {
  try {
    const services = await Service.find({ status: 'pending' }).populate('provider', 'name businessName').sort('-createdAt');
    res.json(services);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/services/:id/approve', adminGuard, async (req, res) => {
  try {
    const s = await Service.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json({ message: 'Service approved', service: s });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/services/:id/reject', adminGuard, async (req, res) => {
  try {
    const { reason } = req.body;
    const s = await Service.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
    res.json({ message: 'Service rejected', service: s });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── All Orders (Admin view) ──────────────────────────────────
router.get('/orders', adminGuard, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .populate('customer', 'name phone')
      .populate('provider', 'name businessName')
      .sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Reports ──────────────────────────────────────────────────
router.get('/reports/sales', adminGuard, async (req, res) => {
  try {
    const monthly = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    res.json(monthly);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/reports/providers', adminGuard, async (req, res) => {
  try {
    const data = await Order.aggregate([
      { $group: { _id: '$provider', totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$totalAmount' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' } },
      { $unwind: '$provider' },
      { $project: { 'provider.name': 1, 'provider.businessName': 1, totalOrders: 1, totalRevenue: 1 } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Menu Management ──────────────────────────────────────────
router.get('/menu', adminGuard, async (req, res) => {
  try {
    const menus = await Menu.find().sort('sortOrder');
    res.json(menus);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/menu', adminGuard, async (req, res) => {
  try {
    const { name, icon, parentId, type } = req.body;
    let level = 0;
    if (parentId) {
      const parent = await Menu.findById(parentId);
      level = parent ? parent.level + 1 : 0;
    }
    const menu = await Menu.create({ name, icon: icon || '📁', parentId: parentId || null, type: type || 'folder', level, createdBy: req.user._id });
    res.status(201).json(menu);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/menu/:id', adminGuard, async (req, res) => {
  try {
    const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(menu);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/menu/:id', adminGuard, async (req, res) => {
  try {
    await Menu.findByIdAndDelete(req.params.id);
    await Menu.deleteMany({ parentId: req.params.id }); // remove children too
    res.json({ message: 'Menu deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Region Management ────────────────────────────────────────
router.get('/regions', adminGuard, async (req, res) => {
  try {
    const regions = await Region.find().sort('type name');
    res.json(regions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/regions', adminGuard, async (req, res) => {
  try {
    const region = await Region.create({ ...req.body });
    res.status(201).json(region);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/regions/:id', adminGuard, async (req, res) => {
  try {
    const region = await Region.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(region);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/regions/:id', adminGuard, async (req, res) => {
  try {
    await Region.findByIdAndDelete(req.params.id);
    res.json({ message: 'Region deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
