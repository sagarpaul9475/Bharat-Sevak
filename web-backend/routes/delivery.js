const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { notifyUser, notifyRole } = require('../utils/notifications');

// Helper to broadcast socket events safely
const emitToOrder = (req, orderId, eventName, payload) => {
  try {
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit(eventName, payload);
      if (payload?.customer) {
        const custId = typeof payload.customer === 'object' ? payload.customer._id : payload.customer;
        io.to(String(custId)).emit(eventName, payload);
      }
      if (payload?.provider) {
        const provId = typeof payload.provider === 'object' ? payload.provider._id : payload.provider;
        io.to(String(provId)).emit(eventName, payload);
      }
    }
  } catch (err) {
    console.error('Socket broadcast error:', err.message);
  }
};

// ── GET Available Delivery Personnel & Technicians ──────────
router.get('/workers', verifyToken, async (req, res) => {
  try {
    const { specialization, role } = req.query;
    const filter = {
      $or: [
        { role: 'delivery' },
        { role: 'provider', providerType: { $in: ['service', 'both'] } }
      ],
      status: { $in: ['active', 'approved'] }
    };
    if (specialization) {
      filter.serviceSpecialization = { $regex: specialization, $options: 'i' };
    }
    const workers = await User.find(filter)
      .select('name phone role deliveryVehicleType serviceSpecialization isAvailable currentLocation address region businessName deliveryCoverage')
      .limit(30);
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET Delivery Tasks for Worker or Provider ───────────────
router.get('/tasks', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const workerPin = String(req.user.region?.pincode || '');
    const workerCoverage = req.user.deliveryCoverage || { mode: 'local', pincodes: [] };
    const userRole = req.user.role;
    let filter = {};

    if (userRole === 'delivery') {
      // Show orders assigned to this worker, or open confirmed orders that need delivery
      filter = {
        $or: [
          { assignedTo: userId },
          { status: { $in: ['confirmed', 'assigned'] }, assignedTo: { $exists: false } },
          { status: { $in: ['confirmed', 'assigned'] }, assignedTo: null }
        ]
      };
    } else if (userRole === 'provider') {
      filter = { provider: userId };
    } else if (userRole === 'admin') {
      filter = {};
    } else {
      // Customer
      filter = { customer: userId };
    }

    let tasks = await Order.find(filter)
      .populate('customer', 'name phone address')
      .populate('provider', 'name businessName phone address')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization')
      .sort('-createdAt')
      .limit(50);

    if (userRole === 'delivery') {
      tasks = tasks.filter(task => {
        if (String(task.assignedTo?._id || task.assignedTo || '') === String(userId)) return true;
        if (!['confirmed', 'assigned'].includes(task.status)) return false;
        const destination = String(task.deliveryPincode || '');
        if (!/^\d{6}$/.test(destination)) return false;
        if (workerCoverage.mode === 'cross_city') return (workerCoverage.pincodes || []).includes(destination);
        return Boolean(workerPin) && workerPin === destination;
      });
    }

    // Redact deliveryOtp if requester is a delivery agent and order is not yet completed
    const safeTasks = tasks.map(task => {
      const obj = task.toObject();
      if (userRole === 'delivery' && !obj.otpVerified) {
        delete obj.deliveryOtp;
      }
      return obj;
    });

    res.json(safeTasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET Live Tracking Details for an Order ──────────────────
router.get('/orders/:id/track', verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone address')
      .populate('provider', 'name businessName phone address')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Authorization check
    const userId = String(req.user._id);
    const isCustomer = String(order.customer?._id || order.customer) === userId;
    const isProvider = String(order.provider?._id || order.provider) === userId;
    const isAssigned = order.assignedTo && String(order.assignedTo?._id || order.assignedTo) === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAssigned && !isAdmin) {
      return res.status(403).json({ message: 'Access denied to track this order' });
    }

    const result = order.toObject();

    // Security: Only customer or admin can see the plain deliveryOtp before verification!
    // Delivery agents and providers must ask customer to provide the OTP.
    if (!isCustomer && !isAdmin && !result.otpVerified) {
      delete result.deliveryOtp;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ASSIGN Delivery Partner or Field Technician ─────────────
router.put('/orders/:id/assign', verifyToken, async (req, res) => {
  try {
    const { assignedTo, assignedName, assignedPhone, assignedRole, vehicleType } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check authority: provider who owns order, or admin, or delivery agent self-accepting
    const isOwner = String(order.provider) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    const isSelfClaim = req.user.role === 'delivery' && (!order.assignedTo || String(order.assignedTo) === String(req.user._id));

    if (!isOwner && !isAdmin && !isSelfClaim) {
      return res.status(403).json({ message: 'Not authorized to assign worker to this order' });
    }

    let workerUser = null;
    if (assignedTo) {
      workerUser = await User.findById(assignedTo);
    } else if (isSelfClaim) {
      workerUser = req.user;
    }

    order.assignedTo = workerUser ? workerUser._id : (assignedTo || undefined);
    order.assignedName = assignedName || workerUser?.name || 'Assigned Partner';
    order.assignedPhone = assignedPhone || workerUser?.phone || '';
    order.assignedRole = assignedRole || (order.orderType === 'service' ? 'technician' : 'delivery_man');
    order.status = 'assigned';
    order.fulfillmentStatus = 'assigned';

    // Set pickup & dropoff coordinates if empty
    if (!order.pickupLocation?.lat) {
      order.pickupLocation = {
        lat: 22.5726,
        lng: 88.3639,
        address: 'Provider Pickup Point'
      };
    }
    if (!order.dropoffLocation?.lat) {
      order.dropoffLocation = {
        lat: 22.5850,
        lng: 88.3750,
        address: order.deliveryAddress || 'Customer Destination'
      };
    }

    // Set initial driver live location near pickup
    order.liveLocation = {
      lat: order.pickupLocation.lat,
      lng: order.pickupLocation.lng,
      heading: 0,
      speed: 0,
      isLive: true,
      updatedAt: new Date(),
    };

    order.statusHistory.push({
      status: 'assigned',
      changedBy: req.user._id,
      note: `Assigned to ${order.assignedName} (${order.assignedRole})`
    });

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('provider', 'name businessName phone')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization');

    // Notify customer
    await notifyUser(order.customer, {
      title: order.orderType === 'service' ? 'Technician assigned' : 'Delivery partner assigned',
      message: `${order.assignedName} has been assigned to your order ${order.orderId}.`,
      type: 'order',
      link: '/orders',
      metadata: { orderId: String(order._id), status: 'assigned' },
    });

    emitToOrder(req, order._id, 'order:updated', populated);
    emitToOrder(req, order._id, 'order:assigned', populated);

    res.json({ message: 'Order successfully assigned', order: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE Fulfillment Status (En Route, Arrived, In Progress) ──
router.put('/orders/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, fulfillmentStatus, note } = req.body;
    const allowed = ['confirmed', 'assigned', 'out_for_delivery', 'in_progress', 'arrived', 'completed', 'cancelled'];
    
    const targetStatus = status || (fulfillmentStatus === 'en_route' ? 'out_for_delivery' : fulfillmentStatus === 'arrived' ? 'in_progress' : fulfillmentStatus);
    if (!allowed.includes(targetStatus)) {
      return res.status(400).json({ message: 'Invalid status transition' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = targetStatus;
    if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus;
    if (targetStatus === 'out_for_delivery') order.fulfillmentStatus = 'en_route';
    if (targetStatus === 'in_progress') order.fulfillmentStatus = 'in_progress';

    order.statusHistory.push({
      status: targetStatus,
      changedBy: req.user._id,
      note: note || `Status updated to ${targetStatus}`
    });

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('provider', 'name businessName phone')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization');

    // Notifications
    const statusTitles = {
      out_for_delivery: order.orderType === 'service' ? 'Technician en route 🔧' : 'Order out for delivery 🛵',
      in_progress: order.orderType === 'service' ? 'Service in progress 🛠️' : 'Delivery partner arrived 📍',
      arrived: 'Partner arrived at destination 📍',
      completed: 'Order completed & delivered 🎉'
    };

    if (statusTitles[targetStatus]) {
      await notifyUser(order.customer, {
        title: statusTitles[targetStatus],
        message: `${order.orderId}: ${note || statusTitles[targetStatus]}`,
        type: 'order',
        link: '/orders',
        metadata: { orderId: String(order._id), status: targetStatus },
      });
    }

    emitToOrder(req, order._id, 'order:updated', populated);
    emitToOrder(req, order._id, 'order:status_update', { orderId: order._id, status: targetStatus, fulfillmentStatus: order.fulfillmentStatus });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE Live GPS Location ─────────────────────────────────
router.put('/orders/:id/location', verifyToken, async (req, res) => {
  try {
    const { lat, lng, heading = 0, speed = 0, isLive = true } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const newLocation = {
      lat: Number(lat),
      lng: Number(lng),
      heading: Number(heading) || 0,
      speed: Number(speed) || 0,
      isLive: Boolean(isLive),
      updatedAt: new Date(),
    };

    order.liveLocation = newLocation;
    // Keep last 40 points in history
    order.locationHistory.push({ lat: Number(lat), lng: Number(lng), timestamp: new Date() });
    if (order.locationHistory.length > 40) {
      order.locationHistory.shift();
    }

    await order.save();

    // Broadcast live location to order room and parties
    emitToOrder(req, order._id, 'order:location_update', {
      orderId: order._id,
      liveLocation: newLocation,
      timestamp: new Date()
    });

    res.json({ success: true, liveLocation: newLocation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── VERIFY Customer OTP (Delivery & Service Completion) ───────
router.post('/orders/:id/verify-otp', verifyToken, async (req, res) => {
  try {
    const { otp, notes } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required for verification' });
    }

    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('provider', 'name businessName phone');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.otpVerified || order.status === 'completed') {
      return res.status(400).json({ message: 'This order has already been verified and completed.' });
    }

    // Verify OTP matching
    const cleanSubmittedOtp = String(otp).trim();
    const cleanActualOtp = String(order.deliveryOtp || '').trim();

    if (cleanSubmittedOtp !== cleanActualOtp) {
      return res.status(400).json({
        success: false,
        message: '❌ Invalid OTP! Please ask the customer to check the 4-digit code in their Bharat Sevak app.'
      });
    }

    // OTP is valid! Mark as completed and verified
    order.otpVerified = true;
    order.otpVerifiedAt = new Date();
    order.status = 'completed';
    order.fulfillmentStatus = 'completed';

    // If payment method was cash or pending on delivery, mark payment as completed
    if (order.paymentMethod === 'cash' || order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
    }

    order.statusHistory.push({
      status: 'completed',
      changedBy: req.user._id,
      note: `✅ Verified via Customer OTP [${cleanSubmittedOtp}]. Delivery / Service confirmed.${notes ? ` Note: ${notes}` : ''}`
    });

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone address')
      .populate('provider', 'name businessName phone address')
      .populate('assignedTo', 'name phone deliveryVehicleType serviceSpecialization');

    // Notify Customer
    await notifyUser(order.customer._id || order.customer, {
      title: order.orderType === 'service' ? 'Service Completed & Confirmed! 🔧✅' : 'Order Delivered Successfully! 📦✅',
      message: `Your order ${order.orderId} was confirmed via OTP verification. Thank you for using Bharat Sevak!`,
      type: 'order',
      link: '/orders',
      metadata: { orderId: String(order._id), status: 'completed' },
    });

    // Notify Provider (Shop Owner)
    await notifyUser(order.provider._id || order.provider, {
      title: 'Order Delivered & OTP Verified! 💰✅',
      message: `Order ${order.orderId} has been successfully delivered/completed with OTP verification confirmed.`,
      type: 'order',
      link: '/provider/orders',
      metadata: { orderId: String(order._id), status: 'completed' },
    });

    // Real-time broadcast to all viewers
    emitToOrder(req, order._id, 'order:completed', {
      orderId: order._id,
      otpVerified: true,
      otpVerifiedAt: order.otpVerifiedAt,
      status: 'completed',
      fulfillmentStatus: 'completed',
      message: 'Order completed and OTP verified!'
    });
    emitToOrder(req, order._id, 'order:updated', populated);

    res.json({
      success: true,
      message: '✅ OTP Verified successfully! Order marked as completed for Customer, Provider, and Delivery Agent.',
      order: populated
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
