import { useEffect, useState } from 'react';
import { deliveryAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import LiveTrackingModal from '../../components/LiveTrackingModal';
import toast from 'react-hot-toast';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active' | 'completed' | 'all'
  const [activeTrackingId, setActiveTrackingId] = useState(null);
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadTasks = () => {
    setLoading(true);
    deliveryAPI.getTasks()
      .then(res => setTasks(res.data))
      .catch(() => toast.error('Failed to load delivery tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleUpdateStatus = async (orderId, targetStatus) => {
    try {
      await deliveryAPI.updateStatus(orderId, { status: targetStatus });
      toast.success(`Task status updated to ${targetStatus.replace('_', ' ')}`);
      loadTasks();
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 4) {
      toast.error('Please enter the 4-digit OTP provided by customer');
      return;
    }

    setVerifying(true);
    try {
      const res = await deliveryAPI.verifyOtp(otpModalOrder._id, { otp: otpInput.trim() });
      toast.success(res.data.message || 'OTP Verified! Task marked as completed.');
      setOtpModalOrder(null);
      setOtpInput('');
      loadTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'rejected';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }} className="animate-fade">
      
      {/* Top Banner */}
      <div className="card mb-4" style={{
        background: 'linear-gradient(135deg, #1E293B, #0F172A)',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🛵</span>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#F8FAFC' }}>
                Delivery & Service Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Welcome, {user?.name} • {user?.serviceSpecialization || 'Field Partner'} ({user?.deliveryVehicleType || 'Vehicle'})
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadTasks}>
            🔄 Refresh Tasks
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-4">
        <button className={`tab-btn ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
          ⚡ Active Orders & Jobs ({tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length})
        </button>
        <button className={`tab-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
          ✅ Completed Deliveries ({tasks.filter(t => t.status === 'completed').length})
        </button>
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          📋 All Tasks ({tasks.length})
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{filter === 'completed' ? '🏁' : '🛵'}</div>
          <div className="empty-title">No {filter} delivery or service tasks</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            When a shop owner assigns an order to you, it will appear here instantly.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredTasks.map(task => {
            const isService = task.orderType === 'service';
            return (
              <div
                key={task._id}
                className="card"
                style={{
                  borderLeft: `5px solid ${task.status === 'completed' ? '#10B981' : task.status === 'out_for_delivery' || task.status === 'in_progress' ? '#3B82F6' : '#F59E0B'}`,
                  position: 'relative'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{isService ? '🔧' : '🛵'}</span>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--saffron)', margin: 0 }}>
                        {task.orderId}
                      </h3>
                      <span className={`badge badge-${task.status === 'completed' ? 'completed' : task.status === 'out_for_delivery' || task.status === 'in_progress' ? 'confirmed' : 'pending'}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {isService ? 'On-Site Service Request' : 'Product Delivery'} • {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#F8FAFC' }}>
                      ₹{task.totalAmount}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: task.paymentStatus === 'paid' ? '#10B981' : '#F59E0B' }}>
                      {task.paymentStatus === 'paid' ? 'PAID ONLINE' : `COLLECT CASH ON DELIVERY`}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid-2 mb-3" style={{ background: 'rgba(15,23,42,0.6)', padding: 14, borderRadius: 10, gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                      👤 Customer & Destination
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{task.customer?.name}</div>
                    <div style={{ fontSize: 13, color: '#38BDF8', marginTop: 2 }}>
                      <a href={`tel:${task.customer?.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        📞 {task.customer?.phone}
                      </a>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>📍 {task.deliveryAddress || 'Customer Address'}</div>
                    {task.shippingAddress && <div style={{ fontSize: 12, marginTop: 6 }}>
                      <strong>Recipient:</strong> {task.shippingAddress.fullName}<br/>
                      <strong>Contact:</strong> <a href={`tel:${task.shippingAddress.phone}`} style={{ color: 'inherit' }}>{task.shippingAddress.phone}</a><br/>
                      {task.shippingAddress.addressLine1}{task.shippingAddress.addressLine2 ? `, ${task.shippingAddress.addressLine2}` : ''}{task.shippingAddress.landmark ? `, ${task.shippingAddress.landmark}` : ''}<br/>
                      {[task.shippingAddress.city, task.shippingAddress.district, task.shippingAddress.state, task.shippingAddress.pincode].filter(Boolean).join(', ')}<br/>
                      {task.shippingAddress.locationInstructions && <>Instructions: {task.shippingAddress.locationInstructions}<br/></>}
                      {task.shippingAddress.latitude != null && task.shippingAddress.longitude != null && <a href={`https://www.google.com/maps?q=${task.shippingAddress.latitude},${task.shippingAddress.longitude}`} target="_blank" rel="noreferrer">Open destination in Maps</a>}
                    </div>}
                    <div style={{ fontSize: 12, marginTop: 6 }}><strong>Preferred fulfilment:</strong> {task.deliveryPreference === 'post_office' ? '📮 Post office — provider coordinates dispatch' : '🛵 Delivery driver'}</div>
                    {task.customer?.email && <div style={{ fontSize: 12 }}><a href={`mailto:${task.customer.email}`} style={{ color: 'inherit' }}>{task.customer.email}</a></div>}
                    {task.notes && (
                      <div style={{ fontSize: 12, marginTop: 6, padding: '4px 8px', background: '#334155', borderRadius: 6 }}>
                        <strong>Note:</strong> {task.notes}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                      🏪 Provider / Pickup Location
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{task.provider?.businessName || task.provider?.name}</div>
                    <div style={{ fontSize: 13, color: '#38BDF8', marginTop: 2 }}>
                      <a href={`tel:${task.provider?.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        📞 {task.provider?.phone}
                      </a>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      📦 Items: {task.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTrackingId(task._id)}
                    >
                      📍 Live GPS Map & Route
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {task.status === 'confirmed' || task.status === 'assigned' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleUpdateStatus(task._id, 'out_for_delivery')}
                      >
                        🚀 Start Delivery (En Route)
                      </button>
                    ) : null}

                    {task.status === 'out_for_delivery' ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUpdateStatus(task._id, 'in_progress')}
                      >
                        📍 Mark Arrived at Customer
                      </button>
                    ) : null}

                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => { setOtpModalOrder(task); setOtpInput(''); }}
                        style={{ fontWeight: 800 }}
                      >
                        🔑 Enter Customer OTP to Complete
                      </button>
                    )}

                    {task.status === 'completed' && (
                      <span className="badge badge-completed" style={{ padding: '6px 12px' }}>
                        ✅ Verified & Completed via Customer OTP
                      </span>
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
          onOrderUpdated={loadTasks}
        />
      )}

      {/* OTP Verification Prompt Modal */}
      {otpModalOrder && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => e.target.classList.contains('modal-overlay') && setOtpModalOrder(null)}>
          <div className="modal-box" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>🔐</div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Verify Customer Completion OTP</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Order #{otpModalOrder.orderId} • Ask the customer for the 4-digit code displayed in their app
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
                  disabled={verifying || otpInput.length !== 4}
                >
                  {verifying ? '⏳ Verifying...' : '✅ Confirm Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
