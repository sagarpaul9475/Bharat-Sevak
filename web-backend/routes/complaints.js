const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { sendComplaintEmail, complaintEmailHtml } = require('../utils/mailer');

// ── POST: File a new complaint ──────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { orderId, complaintType, subject, details } = req.body;
    if (!complaintType || !subject || !details) {
      return res.status(400).json({ message: 'complaintType, subject, and details are required' });
    }

    const customer = await User.findById(req.user._id).select('name email');
    let providerUser = null;

    // Try to resolve the provider from the order ID
    if (orderId) {
      const order = await Order.findOne({ orderId }).populate('provider', 'name email businessName');
      if (order && order.provider) providerUser = order.provider;
    }

    const complaint = await Complaint.create({
      customer: req.user._id,
      provider: providerUser?._id || null,
      orderId: orderId || null,
      complaintType,
      subject,
      details,
    });

    // Build email html
    const html = complaintEmailHtml({
      complaintId: complaint.complaintId,
      complaintType,
      subject,
      details,
      orderId,
      customerName: customer.name,
      customerEmail: customer.email,
      providerName: providerUser?.businessName || providerUser?.name || null,
    });

    // Get admin email
    const adminUser = await User.findOne({ role: 'admin' }).select('email');

    // Send to admin
    if (adminUser?.email) {
      await sendComplaintEmail({ to: adminUser.email, subject: `[Grievance] ${complaint.complaintId}: ${subject}`, html });
      complaint.emailSentToAdmin = true;
    }

    // Send to provider
    if (providerUser?.email) {
      await sendComplaintEmail({ to: providerUser.email, subject: `[Bharat Sevak Complaint] Regarding your service — ${complaint.complaintId}`, html });
      complaint.emailSentToProvider = true;
    }

    await complaint.save();
    res.status(201).json(complaint);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET: Customer's own complaints ──────────────────────────────────────
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const complaints = await Complaint.find({ customer: req.user._id }).sort('-createdAt');
    res.json(complaints);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET: Admin — all complaints ──────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { status } = req.query;
    const filter = status ? { status } : {};
    const complaints = await Complaint.find(filter).populate('customer', 'name email phone').populate('provider', 'name businessName email').sort('-createdAt');
    res.json(complaints);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT: Admin — update status / add note ───────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { status, adminNote } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true });
    res.json(complaint);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
