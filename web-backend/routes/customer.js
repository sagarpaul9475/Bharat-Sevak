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
    const { category, search, state, district, area, pincode, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (state) filter['region.state'] = state;
    if (district) filter['region.district'] = district;
    if (area) filter['region.area'] = area;
    if (pincode) { if (!/^\\d{6}$/.test(String(pincode))) return res.status(400).json({ message: 'PIN code must be 6 digits' }); filter['region.pincode'] = String(pincode); }
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
    const { serviceType, search, state, pincode, page = 1, limit = 12 } = req.query;
    const filter = { status: 'approved' };
    if (serviceType) filter.serviceType = serviceType;
    if (state) filter['region.state'] = state;
    if (pincode) { if (!/^\\d{6}$/.test(String(pincode))) return res.status(400).json({ message: 'PIN code must be 6 digits' }); filter['region.pincode'] = String(pincode); }
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
    const { items, paymentMethod, deliveryAddress, deliveryPincode, notes } = req.body;
    const destinationPincode = String(deliveryPincode || req.user.region?.pincode || '').trim();
    if (!/^\\d{6}$/.test(destinationPincode)) return res.status(400).json({ message: 'Enter a valid 6-digit delivery PIN code in your profile or checkout' });
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
    const hasService = orderItems.some(i => i.itemType === 'service');
    const hasProduct = orderItems.some(i => i.itemType === 'product');
    const orderType = (hasService && hasProduct) ? 'mixed' : hasService ? 'service' : 'product';
    const providerUser = await User.findById(providerId);
    const providerPin = String(providerUser?.region?.pincode || '');
    const canProviderServeDestination = providerUser?.deliveryCoverage?.mode === 'cross_city' ? (providerUser.deliveryCoverage.pincodes || []).includes(destinationPincode) : (!providerPin || providerPin === destinationPincode);
    if (!canProviderServeDestination) return res.status(400).json({ message: 'This provider does not currently deliver to that PIN code' });

    // Initial coordinates (with subtle deterministic delta based on order count so points are distinct on map)
    const baseLat = 22.5726;
    const baseLng = 88.3639;
    const randOffsetLat = ((Math.random() - 0.5) * 0.03);
    const randOffsetLng = ((Math.random() - 0.5) * 0.03);
    const dropLat = baseLat + randOffsetLat + 0.015;
    const dropLng = baseLng + randOffsetLng + 0.018;

    const order = await Order.create({
      customer: req.user._id,
      provider: providerId,
      items: orderItems,
      totalAmount,
      paymentMethod: selectedPaymentMethod,
      deliveryAddress: `${deliveryAddress || req.user.address || 'Customer Destination'}${deliveryAddress || req.user.address ? ', ' : ''}PIN: ${destinationPincode}`,
      deliveryPincode: destinationPincode,
      notes,
      orderType,
      deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
      pickupLocation: {
        address: providerUser?.businessName || providerUser?.address || 'Provider Facility',
        lat: baseLat,
        lng: baseLng,
      },
      dropoffLocation: {
        address: deliveryAddress || req.user.address || 'Customer Destination',
        lat: dropLat,
        lng: dropLng,
      },
      liveLocation: {
        lat: baseLat,
        lng: baseLng,
        heading: 35,
        speed: 0,
        isLive: false,
        updatedAt: new Date(),
      },
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
    const orders = await Order.find(filter)
      .populate('provider', 'name businessName phone address')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization')
      .sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/orders/:id', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
      .populate('provider', 'name businessName phone address')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization');
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

// ── UPI Payment Info for Order ──────────────────────────────────────────────
// Returns provider's UPI/bank details and the order amount so the customer can pay
router.get('/orders/:id/payment-info', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
      .select('orderId totalAmount paymentStatus paymentMethod utrNumber payerPhone paymentSubmittedAt otpVerified status')
      .populate('provider', 'name businessName phone upiDetails bankDetails');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Customer submits UPI/payment reference after paying via QR code
router.post('/orders/:id/submit-payment', verifyToken, async (req, res) => {
  try {
    const { utrNumber, payerPhone, paymentNote } = req.body;
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'Payment already confirmed' });
    // Allow payment submission only after delivery is completed / OTP verified
    if (!order.otpVerified && order.status !== 'completed') {
      return res.status(400).json({ message: 'Payment can only be submitted after the delivery/service is completed and OTP is verified.' });
    }
    if (!utrNumber || utrNumber.trim().length < 6) {
      return res.status(400).json({ message: 'Please enter a valid UTR / Transaction Reference number (minimum 6 characters).' });
    }
    order.utrNumber = utrNumber.trim();
    order.payerPhone = (payerPhone || '').trim();
    order.paymentNote = (paymentNote || '').trim();
    order.paymentSubmittedAt = new Date();
    order.paymentMethod = 'qr';
    await order.save();
    await notifyUser(order.provider, {
      title: '💰 Payment Reference Received',
      message: `Customer submitted UTR ${utrNumber} for order ${order.orderId}. Please verify and confirm payment.`,
      type: 'order',
      link: '/provider/orders',
      metadata: { orderId: String(order._id) },
    });
    res.json({ message: 'Payment reference submitted. The provider will confirm receipt shortly.', order });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
