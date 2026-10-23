import { useEffect, useState } from 'react';
import { providerAPI, deliveryAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import AssignWorkerModal from '../../components/AssignWorkerModal';
import LiveTrackingModal from '../../components/LiveTrackingModal';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function ProviderOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  // Modals
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [activeTrackingId, setActiveTrackingId] = useState(null);
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const load = () => {
    setLoading(true);
    providerAPI.getOrders({ status: filter || undefined })
      .then(r => setOrders(r.data.orders))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();

    // Socket listener for real-time delivery and OTP events
    if (user?._id) {
      const socket = io('http://localhost:4000', { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        socket.emit('join', user._id);
      });

      socket.on('order:completed', () => {
        toast.success('🎉 An order was delivered and confirmed via OTP!');
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
  }, [filter, user?._id]);

  const updateStatus = async (id, status) => {
    try {
      await providerAPI.updateOrderStatus(id, { status });
      toast.success('Order status updated');
      load();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 4) {
      toast.error('Please enter the 4-digit OTP provided by customer');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await deliveryAPI.verifyOtp(otpModalOrder._id, { otp: otpInput.trim() });
      toast.success(res.data.message || 'OTP Verified! Order marked as completed.');
      setOtpModalOrder(null);
      setOtpInput('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
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
          <h1 className="page-title">🧾 Order & Service Management</h1>
          <p className="page-subtitle">Assign delivery partners, monitor live driver location, and verify completion OTP</p>
        </div>
      </div>

      <div className="tabs mb-4">
        {['', 'pending', 'confirmed', 'assigned', 'out_for_delivery', 'in_progress', 'completed', 'rejected'].map(s => (
          <button key={s} className={`tab-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s ? s.replace('_', ' ').toUpperCase() : 'ALL ORDERS'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <div className="empty-title">No orders found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {orders.map(o => {
            const isService = o.orderType === 'service';
            const isCompleted = o.status === 'completed';

            return (
              <div key={o._id} className="card" style={{ borderLeft: `5px solid ${getStatusColor(o.status)}` }}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span style={{ fontSize: 20 }}>{isService ? '🔧' : '🛵'}</span>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--saffron)' }}>{o.orderId}</h3>
                      <span className={`badge badge-${o.status === 'completed' ? 'completed' : o.status === 'out_for_delivery' || o.status === 'in_progress' ? 'confirmed' : o.status === 'cancelled' ? 'rejected' : o.status}`}>
                        {o.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {o.otpVerified ? (
                        <span className="badge badge-completed" style={{ fontSize: 11 }}>
                          ✅ OTP Verified
                        </span>
                      ) : o.status !== 'rejected' && o.status !== 'cancelled' ? (
                        <span className="badge badge-pending" style={{ fontSize: 11 }}>
                          🔒 OTP Pending
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted">
                      {new Date(o.createdAt).toLocaleString()} • {isService ? 'Service Job' : 'Product Order'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div style={{ fontSize: 24, fontWeight: 800 }}>₹{o.totalAmount}</div>
                    <div className={`text-xs font-bold text-${o.paymentStatus === 'paid' ? 'emerald' : 'pending'}`}>
                      {o.paymentStatus.toUpperCase()} ({o.paymentMethod.toUpperCase()})
                    </div>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid-2 mb-4" style={{ gap: 20, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
                  <div>
                    <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Customer & Destination</div>
                    <div className="font-medium text-md">{o.customer?.name}</div>
                    <div className="text-sm mt-1">📞 {o.customer?.phone}</div>
                    {o.deliveryAddress && <div className="text-sm mt-1">📍 {o.deliveryAddress}</div>}
                    {o.notes && <div className="text-sm mt-2 p-2 rounded" style={{ background: 'var(--navy-border)' }}><strong>Note:</strong> {o.notes}</div>}

                    {/* Assigned Worker Info */}
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--navy-border)' }}>
                      <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                        {isService ? '🔧 Assigned Field Technician' : '🛵 Assigned Delivery Partner'}
                      </div>
                      {o.assignedName || o.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 16 }}>{isService ? '🛠️' : '🛵'}</span>
                          <span className="font-bold text-sm">{o.assignedName || o.assignedTo?.name}</span>
                          {(o.assignedPhone || o.assignedTo?.phone) && (
                            <span className="text-xs text-muted">(📞 {o.assignedPhone || o.assignedTo?.phone})</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted italic mt-1">
                          No delivery partner or technician assigned yet. Click "Assign Partner" below.
                        </div>
                      )}
                    </div>
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

                    {/* OTP status summary */}
                    <div className="mt-3 p-3 rounded" style={{
                      background: o.otpVerified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${o.otpVerified ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.2)'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{o.otpVerified ? '✅' : '🔒'}</span>
                        <div style={{ fontSize: 12 }}>
                          <strong>{o.otpVerified ? 'Completion Confirmed' : 'Customer OTP Verification:'}</strong>{' '}
                          {o.otpVerified
                            ? `Confirmed on ${new Date(o.otpVerifiedAt || o.updatedAt).toLocaleTimeString()}`
                            : 'Customer holds 4-digit OTP. Driver enters it upon delivery to confirm.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions based on status */}
                <div className="flex gap-2 justify-end items-center flex-wrap" style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 16 }}>
                  
                  {/* Live Tracking & Location Monitoring Button */}
                  {o.status !== 'rejected' && o.status !== 'cancelled' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => setActiveTrackingId(o._id)}
                    >
                      <span>📍</span> Live Map & Tracking
                    </button>
                  )}

                  {o.status === 'pending' && (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o._id, 'rejected')}>
                        ❌ Reject
                      </button>
                      <button className="btn btn-success btn-sm" onClick={() => updateStatus(o._id, 'confirmed')}>
                        ✅ Accept & Confirm
                      </button>
                    </>
                  )}

                  {(o.status === 'confirmed' || o.status === 'assigned') && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => setAssigningOrder(o)}
                    >
                      <span>{isService ? '🔧' : '🛵'}</span>
                      {o.assignedName ? 'Reassign Partner' : isService ? 'Assign Technician' : 'Assign Delivery Partner'}
                    </button>
                  )}

                  {o.status === 'assigned' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => updateStatus(o._id, 'out_for_delivery')}
                    >
                      🚀 Dispatch (Out for Delivery)
                    </button>
                  )}

                  {(o.status === 'out_for_delivery' || o.status === 'in_progress') && (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      onClick={() => { setOtpModalOrder(o); setOtpInput(''); }}
                    >
                      <span>🔑</span> Verify Customer OTP
                    </button>
                  )}

                  {o.status === 'completed' && (
                    <span className="badge badge-completed" style={{ padding: '6px 14px' }}>
                      🏁 Delivered & Verified via OTP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Worker Modal */}
      {assigningOrder && (
        <AssignWorkerModal
          order={assigningOrder}
          onClose={() => setAssigningOrder(null)}
          onAssigned={() => { setAssigningOrder(null); load(); }}
        />
      )}

      {/* Live Tracking Modal */}
      {activeTrackingId && (
        <LiveTrackingModal
          orderId={activeTrackingId}
          onClose={() => setActiveTrackingId(null)}
          onOrderUpdated={load}
        />
      )}

      {/* OTP Verification Prompt Modal */}
      {otpModalOrder && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => e.target.classList.contains('modal-overlay') && setOtpModalOrder(null)}>
          <div className="modal-box" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>🔐</div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Verify Customer Completion OTP</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Order #{otpModalOrder.orderId} • Ask the customer for the 4-digit code shown in their app
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: 20 }}>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  placeholder="• • • •"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  style={{
                    background: '#0F172A',
                    border: '2px solid #F59E0B',
                    borderRadius: 12,
                    padding: '14px',
                    fontSize: 32,
                    fontWeight: 900,
                    letterSpacing: 8,
                    textAlign: 'center',
                    color: '#F59E0B',
                    width: '100%',
                    boxShadow: '0 0 16px rgba(245,158,11,0.2)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setOtpModalOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ flex: 2, fontWeight: 700 }}
                  disabled={verifyingOtp || otpInput.length !== 4}
                >
                  {verifyingOtp ? '⏳ Verifying...' : '✅ Confirm Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
