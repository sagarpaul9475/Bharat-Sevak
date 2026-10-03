const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Service = require('../models/Service');
const Order = require('../models/Order');
const User = require('../models/User');
const Menu = require('../models/Menu');
const { verifyToken } = require('../middleware/auth');

// ── Public: Browse Products ──────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const { category, search, state, district, area, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (state) filter['region.state'] = state;
    if (district) filter['region.district'] = district;
    if (area) filter['region.area'] = area;
    if (req.query.provider) filter.provider = req.query.provider;
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { tags: { $in: [new RegExp(search, 'i')] } }];
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
    const products = await Product.find(filter).populate('provider', 'name businessName region').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Product.countDocuments(filter);
    res.json({ products, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Public: Browse Services ──────────────────────────────────
router.get('/services', async (req, res) => {
  try {
    const { serviceType, search, state, page = 1, limit = 12 } = req.query;
    const filter = { status: 'approved' };
    if (serviceType) filter.serviceType = serviceType;
    if (state) filter['region.state'] = state;
    if (req.query.provider) filter.provider = req.query.provider;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const services = await Service.find(filter).populate('provider', 'name businessName region').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Service.countDocuments(filter);
    res.json({ services, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Public: Get Menus (categories) ──────────────────────────
router.get('/menus', async (req, res) => {
  try {
    const menus = await Menu.find({ isActive: true }).sort('sortOrder');
    res.json(menus);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Authenticated: Place Order ───────────────────────────────
router.post('/orders', verifyToken, async (req, res) => {
  try {
    const { items, paymentMethod, deliveryAddress, notes } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'No items in order' });

    // Get provider from first item
    let providerDoc;
    const firstItem = items[0];
    if (firstItem.itemType === 'product') {
      const p = await Product.findById(firstItem.item);
      if (!p) return res.status(404).json({ message: 'Product not found' });
      providerDoc = p.provider;
    } else {
      const s = await Service.findById(firstItem.item);
      if (!s) return res.status(404).json({ message: 'Service not found' });
      providerDoc = s.provider;
    }

    const totalAmount = items.reduce((sum, i) => sum + (i.itemPrice * (i.quantity || 1)), 0);
    const order = await Order.create({
      customer: req.user._id,
      provider: providerDoc,
      items: items.map(i => ({ ...i, subtotal: i.itemPrice * (i.quantity || 1) })),
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      deliveryAddress,
      notes,
      statusHistory: [{ status: 'pending', changedBy: req.user._id }]
    });
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Authenticated: Customer Orders ──────────────────────────
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { customer: req.user._id };
    if (status) filter.status = status;
    const orders = await Order.find(filter).populate('provider', 'name businessName').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/orders/:id', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
      .populate('provider', 'name businessName phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel at this stage' });
    }
    order.status = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', changedBy: req.user._id });
    await order.save();
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update customer profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, address, region } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, address, region }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
