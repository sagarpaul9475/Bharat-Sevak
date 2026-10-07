const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Service = require('../models/Service');
const Order = require('../models/Order');
const User = require('../models/User');
const Menu = require('../models/Menu');
const { verifyToken } = require('../middleware/auth');
const { notifyUser, notifyRole } = require('../utils/notifications');

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

    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ message: 'Choose between 1 and 30 items' });
    }

    // Recalculate prices and names from the database. Never trust amounts sent by the browser.
    let providerId = null;
    const orderItems = [];
    for (const requested of items) {
      if (!['product', 'service'].includes(requested.itemType)) {
        return res.status(400).json({ message: 'Invalid item type' });
      }
      const quantity = Number(requested.quantity || 1);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({ message: 'Quantity must be between 1 and 99' });
      }

      const itemDoc = requested.itemType === 'product'
        ? await Product.findOne({ _id: requested.item, status: 'approved' })
        : await Service.findOne({ _id: requested.item, status: 'approved' });
      if (!itemDoc) return res.status(404).json({ message: 'One of the selected items is unavailable' });

      const itemProviderId = String(itemDoc.provider);
      if (providerId && providerId !== itemProviderId) {
        return res.status(400).json({ message: 'You can only order from one provider at a time' });
      }
      providerId = itemProviderId;
      const itemPrice = Number(requested.itemType === 'product' ? itemDoc.price : itemDoc.rate);
      if (!Number.isFinite(itemPrice) || itemPrice < 0) {
        return res.status(400).json({ message: 'An item has an invalid price' });
      }
      orderItems.push({
        itemType: requested.itemType,
        item: itemDoc._id,
        itemName: itemDoc.name,
        itemPrice,
        quantity,
        subtotal: itemPrice * quantity,
      });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const allowedPaymentMethods = ['cash', 'qr', 'online'];
    const selectedPaymentMethod = allowedPaymentMethods.includes(paymentMethod) ? paymentMethod : 'cash';
    const order = await Order.create({
      customer: req.user._id,
      provider: providerId,
      items: orderItems,
      totalAmount,
      paymentMethod: selectedPaymentMethod,
      deliveryAddress,
      notes,
      statusHistory: [{ status: 'pending', changedBy: req.user._id }]
    });
    await Promise.all([
      notifyUser(providerId, {
        title: 'New order received',
        message: `A customer placed order ${order.orderId || order._id}.`,
        type: 'order',
        link: '/provider/orders',
        metadata: { orderId: String(order._id) },
      }),
      notifyRole('admin', {
        title: 'New marketplace order',
        message: `Order ${order.orderId || order._id} was placed and is awaiting processing.`,
        type: 'order',
        link: '/admin/orders',
        metadata: { orderId: String(order._id) },
      }),
    ]);
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
    await notifyUser(order.provider, {
      title: 'Order cancelled',
      message: `The customer cancelled order ${order.orderId || order._id}.`,
      type: 'order',
      link: '/provider/orders',
      metadata: { orderId: String(order._id) },
    });
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
