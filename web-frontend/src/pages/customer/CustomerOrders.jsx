import { useEffect, useState } from 'react';
import { customerAPI, paymentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import LiveTrackingModal from '../../components/LiveTrackingModal';
import UpiPaymentModal from '../../components/UpiPaymentModal';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import PrintableReceipt from '../../components/PrintableReceipt';
import '../../receipt.css';

export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrackingId, setActiveTrackingId] = useState(null);
  const [upiPayOrder, setUpiPayOrder] = useState(null); // order for UPI payment modal

  const load = () => {
    setLoading(true);
    customerAPI.getOrders()
      .then(r => setOrders(r.data.orders))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // Socket listener for real-time status updates
    if (user?._id) {
      const socket = io('http://localhost:4000', { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        socket.emit('join', user._id);
      });

      socket.on('order:completed', () => {
        toast.success('🎉 Your order was successfully completed & confirmed via OTP!');
        load();
      });

      socket.on('order:status_update', () => {
        load();
      });

      socket.on('order:updated', () => {
        load();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?._id]);

  const cancelOrder = async (id) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await customerAPI.cancelOrder(id);
      toast.success('Order cancelled');
      load();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const payNow = async (order) => {
    try {
      const { data: paymentOrder } = await paymentAPI.createOrder(order._id);
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Could not load payment gateway'));
        });
      }
      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Bharat Sevak',
        description: `Payment for ${order.orderId}`,
        order_id: paymentOrder.gatewayOrderId,
        handler: async (response) => {
          try {
            await paymentAPI.verifyOrder(order._id, response);
            toast.success('Payment verified successfully!');
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment verification failed');
          } finally {
            load();
          }
        },
        modal: { ondismiss: () => toast('Payment window closed') },
        theme: { color: '#F59E0B' }
      });
      checkout.on('payment.failed', (response) => toast.error(response.error?.description || 'Payment failed'));
      checkout.open();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not start payment');
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'pending': return 'var(--pending)';
      case 'confirmed': case 'assigned': case 'out_for_delivery': case 'in_progress': return '#3B82F6';
      case 'completed': return 'var(--emerald)';
      case 'cancelled': case 'rejected': return 'var(--rejected)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 My Orders & Service Bookings</h1>
          <p className="page-subtitle">Track your delivery in real-time and provide OTP upon arrival</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <div className="empty-title">You haven't ordered anything yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {orders.map(o => {
            const isService = o.orderType === 'service';
            const isCompleted = o.status === 'completed';
            const isCancelled = o.status === 'cancelled' || o.status === 'rejected';

            return (
              <div key={o._id} className="card" style={{ borderLeft: `5px solid ${getStatusColor(o.status)}`, position: 'relative' }}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4 border-b border-navy-border pb-4 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span style={{ fontSize: 20 }}>{isService ? '🔧' : '🛵'}</span>
                      <h3 className="font-bold text-lg">Order #{o.orderId}</h3>
                      <span className={`badge badge-${o.status === 'completed' ? 'completed' : o.status === 'out_for_delivery' || o.status === 'in_progress' ? 'confirmed' : o.status === 'cancelled' ? 'rejected' : o.status}`}>
                        {o.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-muted">
                      Placed on {new Date(o.createdAt).toLocaleString()} • {isService ? 'Service Booking' : 'Product Order'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--saffron)' }}>₹{o.totalAmount}</div>
                    <div className={`text-xs font-bold text-${o.paymentStatus === 'paid' ? 'emerald' : 'pending'}`}>
                      {o.paymentStatus.toUpperCase()} ({o.paymentMethod.toUpperCase()})
                    </div>
                  </div>
                </div>

                <PrintableReceipt order={o} viewer="customer" />

                {/* PROMINENT SECRET OTP CARD FOR CUSTOMER */}
                {!isCancelled && (
                  <div style={{
                    background: isCompleted
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))',
                    border: `2px solid ${isCompleted ? '#10B981' : '#F59E0B'}`,
                    borderRadius: 10,
                    padding: '12px 18px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{isCompleted ? '✅' : '🔐'}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: isCompleted ? '#10B981' : '#F59E0B' }}>
                          {isCompleted ? 'Delivery & Service Confirmed' : 'Customer Verification OTP'}
                        </div>
                        <div style={{ fontSize: 13, color: '#CBD5E1', marginTop: 1 }}>
                          {isCompleted
                            ? `Verified via Customer OTP on ${new Date(o.otpVerifiedAt || o.updatedAt).toLocaleTimeString()}`
                            : 'Give this OTP to the delivery agent or service technician ONLY after receiving goods or work is done.'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCompleted ? (
                        <span className="badge badge-completed" style={{ fontSize: 12, padding: '6px 12px' }}>
                          ✅ VERIFIED
                        </span>
                      ) : (
                        <div style={{
                          background: '#0F172A',
                          border: '2px dashed #F59E0B',
                          padding: '6px 16px',
                          borderRadius: 8,
                          fontSize: 24,
                          fontWeight: 900,
                          letterSpacing: 4,
                          color: '#F59E0B',
                          fontFamily: 'monospace'
                        }}>
                          {o.deliveryOtp || '----'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid-2 mb-4" style={{ gap: 20 }}>
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Provider Details</div>
                    <div className="font-bold flex items-center gap-2">
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                        {o.provider?.businessName?.[0] || o.provider?.name?.[0]}
                      </div>
                      <div>
                        <div>{o.provider?.businessName || o.provider?.name}</div>
                        {o.provider?.email && <a href={`mailto:${o.provider.email}`} style={{ display: 'block', fontSize: 12, color: '#F59E0B' }}>✉️ {o.provider.email}</a>}
                        {o.provider?.phone && (
                          <a
                            href={`tel:${o.provider.phone}`}
                            style={{ fontSize: 12, color: '#F59E0B', textDecoration: 'none' }}
                          >
                            📞 {o.provider.phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Assigned Worker with clickable phone */}
                    {o.assignedTo || o.assignedName ? (
                      <div className="mt-3 p-2 rounded bg-navy border border-navy-border text-xs">
                        <span className="font-bold text-saffron">
                          {isService ? '🔧 Assigned Technician:' : '🛵 Assigned Delivery Partner:'}
                        </span>{' '}
                        {o.assignedName || o.assignedTo?.name}
                        {(o.assignedPhone || o.assignedTo?.phone) && (
                          <a
                            href={`tel:${o.assignedPhone || o.assignedTo?.phone}`}
                            style={{ color: '#F59E0B', textDecoration: 'none', marginLeft: 4 }}
                          >
                            📞 {o.assignedPhone || o.assignedTo?.phone}
                          </a>
                        )}
                        {o.assignedTo?.email && <a href={`mailto:${o.assignedTo.email}`} style={{ display: 'block', color: '#F59E0B', marginTop: 4 }}>✉️ {o.assignedTo.email}</a>}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Order Items</div>
                    <div className="bg-navy p-3 rounded border border-navy-border">
                      {o.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-sm mb-1">
                          <span>{i.quantity}x {i.itemName}</span>
                          <span className="font-medium">₹{i.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Delivery and Actions */}
                <div className="flex justify-between items-center bg-navy p-4 rounded mt-4 border border-navy-border flex-wrap gap-3">
                  <div className="text-sm">
                    <span className="font-bold text-muted uppercase mr-2">Destination:</span>
                    {o.deliveryAddress || 'Default Address'}
                    {o.shippingAddress && <div className="mt-2">
                      <div><strong>Recipient:</strong> {o.shippingAddress.fullName} · {o.shippingAddress.phone}</div>
                      <div>{o.shippingAddress.addressLine1}{o.shippingAddress.addressLine2 ? `, ${o.shippingAddress.addressLine2}` : ''}{o.shippingAddress.landmark ? `, ${o.shippingAddress.landmark}` : ''}</div>
                      <div>{[o.shippingAddress.city, o.shippingAddress.district, o.shippingAddress.state, o.shippingAddress.pincode].filter(Boolean).join(', ')}</div>
                      {o.shippingAddress.locationInstructions && <div><strong>Instructions:</strong> {o.shippingAddress.locationInstructions}</div>}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([o.shippingAddress.addressLine1, o.shippingAddress.addressLine2, o.shippingAddress.landmark, o.shippingAddress.city, o.shippingAddress.district, o.shippingAddress.state, o.shippingAddress.pincode].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer">🗺️ Open delivery address in Google Maps</a>
                      {o.shippingAddress.latitude != null && o.shippingAddress.longitude != null && <> · <a href={`https://www.google.com/maps?q=${o.shippingAddress.latitude},${o.shippingAddress.longitude}`} target="_blank" rel="noreferrer">Exact GPS pin</a></>}
                    </div>}
                    <div className="mt-2"><strong>Delivery preference:</strong> {o.deliveryPreference === 'post_office' ? '📮 Post office / postal service' : '🛵 Delivery driver'}</div>
                    {o.deliveryPreference === 'post_office' && o.postOfficeDetails && <div className="mt-1">
                      {o.postOfficeDetails.preferredPostOffice && <div>Post office: {o.postOfficeDetails.preferredPostOffice} {o.postOfficeDetails.postOfficeAddress}</div>}
                      {o.postOfficeDetails.trackingNumber && <div>Tracking / receipt: {o.postOfficeDetails.trackingNumber}</div>}
                      {o.postOfficeDetails.dispatchNotes && <div>Dispatch notes: {o.postOfficeDetails.dispatchNotes}</div>}
                    </div>}
                  </div>

                  <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    {/* Live GPS Track Button */}
                    {!isCancelled && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => setActiveTrackingId(o._id)}
                      >
                        <span>📍</span> Track Live Map
                      </button>
                    )}

                    {/* UPI/QR Pay button — only shown AFTER delivery OTP is verified (post-delivery payment) */}
                    {isCompleted && o.otpVerified && o.paymentStatus !== 'paid' && (
                      <button
                        className="btn btn-success btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                        onClick={() => setUpiPayOrder(o)}
                      >
                        💳 Pay via UPI / QR
                      </button>
                    )}

                    {isCompleted && o.paymentStatus === 'paid' && (
                      <span className="badge badge-completed" style={{ padding: '6px 14px', fontSize: 12 }}>
                        💚 Payment Confirmed
                      </span>
                    )}

                    {isCompleted && o.otpVerified && o.paymentStatus !== 'paid' && o.utrNumber && (
                      <span className="badge badge-pending" style={{ padding: '6px 12px', fontSize: 11 }}>
                        ⏳ UTR Submitted — Awaiting Confirmation
                      </span>
                    )}

                    {/* Legacy Razorpay online payment */}
                    {o.paymentMethod === 'online' && o.paymentStatus !== 'paid' && !isCancelled && !isCompleted && (
                      <button className="btn btn-success btn-sm" onClick={() => payNow(o)}>
                        💳 Pay Now
                      </button>
                    )}

                    {(o.status === 'pending' || o.status === 'confirmed') && (
                      <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o._id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Tracking Modal */}
      {activeTrackingId && (
        <LiveTrackingModal
          orderId={activeTrackingId}
          onClose={() => setActiveTrackingId(null)}
          onOrderUpdated={load}
        />
      )}

      {/* UPI Payment Modal (post-delivery) */}
      {upiPayOrder && (
        <UpiPaymentModal
          order={upiPayOrder}
          onClose={() => setUpiPayOrder(null)}
          onPaymentSubmitted={load}
        />
      )}
    </div>
  );
}
