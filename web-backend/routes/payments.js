const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const getCredentials = () => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
});

// Commission is a configurable proposal, not a hard-coded business commitment.
const getCommissionPercent = () => {
  const value = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 1);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 1;
};

// No Route transfers happen unless explicitly enabled. Live transfers require a second
// explicit opt-in so adding API keys alone can never move provider funds.
const routeTransfersEnabled = (keyId) =>
  process.env.RAZORPAY_ROUTE_TRANSFERS_ENABLED === 'true' &&
  (keyId?.startsWith('rzp_test_') || process.env.RAZORPAY_ROUTE_LIVE_TRANSFERS_ENABLED === 'true');

const razorpayAuth = (keyId, keySecret) =>
  'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function createProviderTransfer({ keyId, keySecret, order, provider, payment }) {
  const commissionPercent = getCommissionPercent();
  const grossPaise = Math.round(Number(order.totalAmount) * 100);
  const commissionPaise = Math.round(grossPaise * commissionPercent / 100);
  // Razorpay Route requires fees and tax to be deducted from the amount transferred.
  // Keep these amounts out of the provider payout calculation unless the API returns them.
  const gatewayFeeAndTaxPaise = Math.max(0, Number(payment.fee || 0)) + Math.max(0, Number(payment.tax || 0));
  const providerPaise = Math.max(0, grossPaise - commissionPaise - gatewayFeeAndTaxPaise);

  order.platformCommissionPercent = commissionPercent;
  order.platformCommissionAmount = commissionPaise / 100;
  order.providerTransferAmount = providerPaise / 100;

  if (!provider?.razorpayRouteAccountId || provider.razorpayRouteStatus !== 'active') {
    order.providerPayoutStatus = 'pending_onboarding';
    return;
  }

  if (!routeTransfersEnabled(keyId)) {
    order.providerPayoutStatus = 'pending_configuration';
    return;
  }

  if (providerPaise <= 0) {
    order.providerPayoutStatus = 'failed';
    return;
  }

  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(order.gatewayPaymentId)}/transfers`, {
    method: 'POST',
    headers: {
      Authorization: razorpayAuth(keyId, keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transfers: [{
        account: provider.razorpayRouteAccountId,
        amount: providerPaise,
        currency: 'INR',
        notes: {
          bharatSevakOrderId: String(order._id),
          orderNumber: String(order.orderId),
          platformCommissionPercent: String(commissionPercent),
        },
      }],
    }),
  });
  const transferResult = await response.json();
  const transfer = Array.isArray(transferResult.items) ? transferResult.items[0] : null;
  if (!response.ok || !transfer?.id) {
    order.providerPayoutStatus = 'failed';
    // Keep the customer payment marked paid; payout can be reconciled/retried separately.
    return;
  }
  order.razorpayTransferId = transfer.id;
  order.providerPayoutStatus = 'transferred';
}

router.post('/orders/:id/create', verifyToken, async (req, res) => {
  try {
    const { keyId, keySecret } = getCredentials();
    if (!keyId || !keySecret) {
      return res.status(503).json({ message: 'Online payments are not configured yet. Add Razorpay test keys to the backend environment.' });
    }

    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid') return res.status(409).json({ message: 'This order has already been paid' });
    if (order.status === 'cancelled' || order.status === 'rejected') {
      return res.status(400).json({ message: 'This order can no longer be paid' });
    }

    // Reuse the existing gateway order on retries to avoid duplicate checkout orders.
    if (order.gatewayOrderId) {
      return res.json({
        keyId,
        gatewayOrderId: order.gatewayOrderId,
        amount: Math.round(order.totalAmount * 100),
        currency: 'INR',
        receipt: order.orderId,
      });
    }

    const amount = Math.round(Number(order.totalAmount) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({ message: 'Order total must be at least ₹1.00' });
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: String(order.orderId).slice(0, 40),
        notes: { bharatSevakOrderId: String(order._id), customerId: String(req.user._id) },
      }),
    });

    const gatewayOrder = await response.json();
    if (!response.ok || !gatewayOrder.id) {
      return res.status(502).json({ message: gatewayOrder.error?.description || 'Could not create online payment order' });
    }

    order.gatewayOrderId = gatewayOrder.id;
    order.paymentMethod = 'online';
    await order.save();

    res.status(201).json({
      keyId,
      gatewayOrderId: gatewayOrder.id,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
      receipt: gatewayOrder.receipt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not start payment. Please try again.' });
  }
});

router.post('/orders/:id/verify', verifyToken, async (req, res) => {
  try {
    const { keyId, keySecret } = getCredentials();
    if (!keyId || !keySecret) {
      return res.status(503).json({ message: 'Online payments are not configured yet.' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'paid' && order.gatewayPaymentId === razorpay_payment_id) {
      return res.json({ message: 'Payment already verified', order });
    }
    if (!order.gatewayOrderId || order.gatewayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Payment order does not match this Bharat Sevak order' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order.gatewayOrderId}|${razorpay_payment_id}`)
      .digest();
    let receivedSignature;
    try {
      receivedSignature = Buffer.from(razorpay_signature, 'hex');
    } catch {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    if (receivedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(receivedSignature, expectedSignature)) {
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    // Confirm with Razorpay's API too; never mark paid from client callback alone.
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || payment.order_id !== order.gatewayOrderId ||
        payment.status !== 'captured' || payment.amount !== Math.round(order.totalAmount * 100)) {
      return res.status(400).json({ message: 'Payment is not captured or the amount does not match the order' });
    }

    order.paymentStatus = 'paid';
    order.paymentMethod = 'online';
    order.gatewayPaymentId = razorpay_payment_id;
    order.txnId = razorpay_payment_id;

    // Payment is verified before any provider transfer is considered. Transfers are
    // disabled by default and live transfers require a separate explicit environment flag.
    const provider = await User.findById(order.provider).select('razorpayRouteAccountId razorpayRouteStatus');
    try {
      await createProviderTransfer({ keyId, keySecret, order, provider, payment });
    } catch (transferError) {
      order.providerPayoutStatus = 'failed';
    }
    await order.save();
    res.json({
      message: 'Payment verified successfully',
      order,
      payout: {
        status: order.providerPayoutStatus,
        transferId: order.razorpayTransferId || undefined,
        commissionPercent: order.platformCommissionPercent,
        providerTransferAmount: order.providerTransferAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not verify payment. If money was deducted, contact support before retrying.' });
  }
});

module.exports = router;
