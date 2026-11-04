const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Service = require('../models/Service');
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Region = require('../models/Region');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyUser } = require('../utils/notifications');

const adminGuard = [verifyToken, requireRole('admin')];

// ── Dashboard Stats ──────────────────────────────────────────
router.get('/dashboard', adminGuard, async (req, res) => {
  try {
    const [users, providers, customers, products, services, orders, pendingProviders, pendingProducts, deliveryChargeSetting] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'provider' }),
        User.countDocuments({ role: 'customer' }),
        Product.countDocuments({ status: 'approved' }),
        Service.countDocuments({ status: 'approved' }),
        Order.countDocuments(),
        User.countDocuments({ role: 'provider', status: 'pending' }),
        Product.countDocuments({ status: 'pending' }),
        Setting.findOne({ key: 'postOfficeDeliveryCharge' }),
      ]);
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const recentOrders = await Order.find().sort('-createdAt').limit(5)
      .populate('customer', 'name').populate('provider', 'name businessName');
    const postOfficeDeliveryCharge = deliveryChargeSetting && typeof deliveryChargeSetting.value === 'number'
      ? deliveryChargeSetting.value
      : 50;

    res.json({
      users,
      providers,
      customers,
      products,
      services,
      orders,
      pendingProviders,
      pendingProducts,
      revenue: revenue[0]?.total || 0,
      recentOrders,
      postOfficeDeliveryCharge,
    });
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
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If admin bans/rejects/suspends a provider -> hide ALL their listings from the marketplace
    const bannedStatuses = ['rejected', 'banned', 'suspended'];
    if (user.role === 'provider' && bannedStatuses.includes(user.status)) {
      await Product.updateMany(
        { provider: user._id, status: { $in: ['approved', 'pending'] } },
        { $set: { status: 'suspended' } }
      );
      await Service.updateMany(
        { provider: user._id, status: { $in: ['approved', 'pending'] } },
        { $set: { status: 'suspended' } }
      );
    }

    // If admin re-approves a provider -> restore their suspended listings back to approved
    if (user.role === 'provider' && user.status === 'approved') {
      await Product.updateMany(
        { provider: user._id, status: 'suspended' },
        { $set: { status: 'approved' } }
      );
      await Service.updateMany(
        { provider: user._id, status: 'suspended' },
        { $set: { status: 'approved' } }
      );
    }

    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/users/:id', adminGuard, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If deleting a provider -> unpublish ALL their listings so they vanish from the marketplace
    if (user.role === 'provider') {
      await Product.updateMany({ provider: user._id }, { $set: { status: 'suspended' } });
      await Service.updateMany({ provider: user._id }, { $set: { status: 'suspended' } });
    }

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
    await notifyUser(user._id, {
      title: 'Provider verification approved',
      message: 'Your provider account has been approved. You can now manage your listings and orders.',
      type: 'verification',
      link: '/provider',
    });
    res.json({ message: 'Provider approved', user });
  } catch (err) { res.status(500).json({ message: 'Could not approve provider' }); }
});

router.put('/approvals/providers/:id/reject', adminGuard, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true }).select('-password');

    // Also suspend their listings when provider is rejected
    if (user) {
      await Product.updateMany(
        { provider: user._id, status: { $in: ['approved', 'pending'] } },
        { $set: { status: 'suspended' } }
      );
      await Service.updateMany(
        { provider: user._id, status: { $in: ['approved', 'pending'] } },
        { $set: { status: 'suspended' } }
      );
      await notifyUser(user._id, {
        title: 'Provider verification update',
        message: 'Your provider application was rejected. Please review the information submitted or contact support.',
        type: 'verification',
        link: '/provider/profile',
      });
    }
    res.json({ message: 'Provider rejected', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Razorpay Route provider onboarding ───────────────────────
// Admin must copy the linked account ID from the approved Razorpay Route dashboard.
// This endpoint does not create linked accounts or move money.
router.put('/providers/:id/razorpay-route', adminGuard, async (req, res) => {
  try {
    const { linkedAccountId, routeStatus } = req.body;
    const allowedStatuses = ['not_started', 'pending', 'active', 'restricted'];
    if (routeStatus !== undefined && !allowedStatuses.includes(routeStatus)) {
      return res.status(400).json({ message: 'Invalid Route onboarding status' });
    }
    if (linkedAccountId !== undefined && typeof linkedAccountId !== 'string') {
      return res.status(400).json({ message: 'Linked account ID must be a string' });
    }
    const update = {};
    if (linkedAccountId !== undefined) update.razorpayRouteAccountId = linkedAccountId.trim();
    if (routeStatus !== undefined) update.razorpayRouteStatus = routeStatus;
    const provider = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'provider' },
      { $set: update },
      { new: true, runValidators: true }
    ).select('name businessName razorpayRouteAccountId razorpayRouteStatus');
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json({ message: 'Provider Route settings updated', provider });
  } catch (error) {
    res.status(500).json({ message: 'Could not update provider Route settings' });
  }
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
    if (p) await notifyUser(p.provider, {
      title: 'Product approved',
      message: `Your product "${p.name}" is approved and can appear in the marketplace.`,
      type: 'listing',
      link: '/provider/products',
      metadata: { listingId: String(p._id), listingType: 'product' },
    });
    res.json({ message: 'Product approved', product: p });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/products/:id/reject', adminGuard, async (req, res) => {
  try {
    const { reason } = req.body;
    // Set status to 'rejected' so it does NOT appear in any public listing (status: 'approved' filter)
    const p = await Product.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
    if (p) await notifyUser(p.provider, {
      title: 'Product needs changes',
      message: `Your product "${p.name}" was rejected.${reason ? ` Reason: ${reason}` : ' Please review the listing and resubmit.'}`,
      type: 'listing',
      link: '/provider/products',
      metadata: { listingId: String(p._id), listingType: 'product' },
    });
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
    if (s) await notifyUser(s.provider, {
      title: 'Service approved',
      message: `Your service "${s.name || s.title}" is approved and can appear in the marketplace.`,
      type: 'listing',
      link: '/provider/services',
      metadata: { listingId: String(s._id), listingType: 'service' },
    });
    res.json({ message: 'Service approved', service: s });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/approvals/services/:id/reject', adminGuard, async (req, res) => {
  try {
    const { reason } = req.body;
    // Set status to 'rejected' so it does NOT appear in any public listing (status: 'approved' filter)
    const s = await Service.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
    if (s) await notifyUser(s.provider, {
      title: 'Service needs changes',
      message: `Your service "${s.name || s.title}" was rejected.${reason ? ` Reason: ${reason}` : ' Please review the listing and resubmit.'}`,
      type: 'listing',
      link: '/provider/services',
      metadata: { listingId: String(s._id), listingType: 'service' },
    });
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
      // Only show active/approved providers — exclude banned, rejected, suspended, or deleted ones
      { $match: { 'provider.status': 'approved', 'provider.role': 'provider' } },
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

// ── Settings (Delivery charges, etc.) ───────────────────────
router.get('/settings/delivery', adminGuard, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'postOfficeDeliveryCharge' });
    const charge = setting && typeof setting.value === 'number' ? setting.value : 50;
    res.json({ postOfficeDeliveryCharge: charge });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/settings/delivery', adminGuard, async (req, res) => {
  try {
    const { postOfficeDeliveryCharge } = req.body;
    const charge = Number(postOfficeDeliveryCharge);
    if (!Number.isFinite(charge) || charge < 0) {
      return res.status(400).json({ message: 'Post office delivery charge must be a valid non-negative number' });
    }
    const setting = await Setting.findOneAndUpdate(
      { key: 'postOfficeDeliveryCharge' },
      { value: charge, updatedBy: req.user._id, description: 'Post office delivery charge in INR' },
      { upsert: true, new: true }
    );
    res.json({ message: 'Post office delivery charge updated successfully', postOfficeDeliveryCharge: setting.value });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
