const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Service = require('../models/Service');
const Order = require('../models/Order');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');
const { notifyUser, notifyRole } = require('../utils/notifications');

const providerGuard = [verifyToken, requireRole('provider', 'admin')];

// ── Dashboard Stats ──────────────────────────────────────────
router.get('/dashboard', providerGuard, async (req, res) => {
  try {
    const providerId = req.user._id;
    const [products, services, totalOrders, pendingOrders, completedOrders] = await Promise.all([
      Product.countDocuments({ provider: providerId }),
      Service.countDocuments({ provider: providerId }),
      Order.countDocuments({ provider: providerId }),
      Order.countDocuments({ provider: providerId, status: 'pending' }),
      Order.countDocuments({ provider: providerId, status: 'completed' }),
    ]);
    const revenue = await Order.aggregate([
      { $match: { provider: providerId, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const payoutSummary = await Order.aggregate([
      { $match: { provider: providerId, paymentStatus: 'paid' } },
      { $group: {
        _id: '$providerPayoutStatus',
        orders: { $sum: 1 },
        amount: { $sum: '$providerTransferAmount' }
      } }
    ]);
    const routeProfile = await User.findById(providerId)
      .select('razorpayRouteAccountId razorpayRouteStatus');
    // Unique customers
    const uniqueCustomers = await Order.distinct('customer', { provider: providerId });
    const recentOrders = await Order.find({ provider: providerId }).sort('-createdAt').limit(5)
      .populate('customer', 'name phone');
    // Co-providers (other providers in the system)
    const coProviders = await User.find({ role: 'provider', _id: { $ne: providerId }, status: 'approved' })
      .select('name businessName providerType region').limit(10);
    res.json({ products, services, totalOrders, pendingOrders, completedOrders, revenue: revenue[0]?.total || 0, uniqueCustomers: uniqueCustomers.length, recentOrders, coProviders, routePayouts: { status: routeProfile?.razorpayRouteStatus || 'not_started', linkedAccountConfigured: Boolean(routeProfile?.razorpayRouteAccountId), summary: payoutSummary } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Products ─────────────────────────────────────────────────
router.get('/products', providerGuard, async (req, res) => {
  try {
    const products = await Product.find({ provider: req.user._id }).sort('-createdAt');
    res.json(products);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/products', providerGuard, async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, provider: req.user._id, region: req.user.region, status: 'pending' });
    await notifyRole('admin', {
      title: 'Product awaiting review',
      message: `${req.user.businessName || req.user.name} submitted a product for approval.`,
      type: 'listing',
      link: '/admin/approvals',
      metadata: { listingId: String(product._id), listingType: 'product' },
    });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/products/:id', providerGuard, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, provider: req.user._id });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    Object.assign(product, { ...req.body, status: 'pending' }); // Re-submit for approval on edit
    await product.save();
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/products/:id', providerGuard, async (req, res) => {
  try {
    await Product.findOneAndDelete({ _id: req.params.id, provider: req.user._id });
    res.json({ message: 'Product deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Services ─────────────────────────────────────────────────
router.get('/services', providerGuard, async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user._id }).sort('-createdAt');
    res.json(services);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/services', providerGuard, async (req, res) => {
  try {
    const service = await Service.create({ ...req.body, provider: req.user._id, region: req.user.region, status: 'pending' });
    await notifyRole('admin', {
      title: 'Service awaiting review',
      message: `${req.user.businessName || req.user.name} submitted a service for approval.`,
      type: 'listing',
      link: '/admin/approvals',
      metadata: { listingId: String(service._id), listingType: 'service' },
    });
    res.status(201).json(service);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/services/:id', providerGuard, async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, provider: req.user._id });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    Object.assign(service, { ...req.body, status: 'pending' });
    await service.save();
    res.json(service);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/services/:id', providerGuard, async (req, res) => {
  try {
    await Service.findOneAndDelete({ _id: req.params.id, provider: req.user._id });
    res.json({ message: 'Service deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Orders ───────────────────────────────────────────────────
router.get('/orders', providerGuard, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { provider: req.user._id };
    if (status) filter.status = status;
    const orders = await Order.find(filter).populate('customer', 'name phone address').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/orders/:id/status', providerGuard, async (req, res) => {
  try {
    const { status, note } = req.body;
    const allowed = ['confirmed', 'in_progress', 'completed', 'rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const order = await Order.findOne({ _id: req.params.id, provider: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({ status, changedBy: req.user._id, note: note || '' });
    await order.save();

    const statusLabels = {
      confirmed: 'accepted',
      in_progress: 'being prepared',
      completed: 'completed',
      rejected: 'rejected',
    };
    await notifyUser(order.customer, {
      title: 'Order update',
      message: `Your order ${order.orderId || order._id} has been ${statusLabels[status]}.${status === 'rejected' && note ? ` Note: ${note}` : ''}`,
      type: 'order',
      link: '/orders',
      metadata: { orderId: String(order._id), status, previousStatus },
    });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Co-Providers ─────────────────────────────────────────────
router.get('/co-providers', providerGuard, async (req, res) => {
  try {
    const coProviders = await User.find({ role: 'provider', _id: { $ne: req.user._id }, status: 'approved' })
      .select('name businessName providerType region profilePic businessDesc').sort('-createdAt');
    res.json(coProviders);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update profile
router.put('/profile', providerGuard, async (req, res) => {
  try {
    const { name, phone, businessName, businessDesc, address, region, providerType } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, businessName, businessDesc, address, region, providerType }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
