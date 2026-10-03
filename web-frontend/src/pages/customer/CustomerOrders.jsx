import { useEffect, useState } from 'react';
import { customerAPI } from '../../api';
import toast from 'react-hot-toast';

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    customerAPI.getOrders().then(r => setOrders(r.data.orders)).catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const cancelOrder = async (id) => {
    if (!confirm('Cancel this order?')) return;
    try { await customerAPI.cancelOrder(id); toast.success('Order cancelled'); load(); } catch { toast.error('Failed to cancel'); }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'pending': return 'var(--pending)';
      case 'confirmed': case 'in_progress': return 'var(--active)';
      case 'completed': return 'var(--emerald)';
      case 'cancelled': case 'rejected': return 'var(--rejected)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 My Orders</h1>
          <p className="page-subtitle">Track your purchases and service requests</p>
        </div>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        orders.length === 0 ? <div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">You haven't ordered anything yet</div></div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(o => (
            <div key={o._id} className="card" style={{ borderLeft: `4px solid ${getStatusColor(o.status)}` }}>
              <div className="flex justify-between items-start mb-4 border-b border-navy-border pb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg">Order #{o.orderId}</h3>
                    <span className={`badge badge-${o.status === 'in_progress' ? 'confirmed' : o.status === 'cancelled' ? 'rejected' : o.status}`}>{o.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-sm text-muted">Placed on {new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--saffron)' }}>₹{o.totalAmount}</div>
                  <div className={`text-xs font-bold text-${o.paymentStatus === 'paid' ? 'emerald' : 'pending'}`}>{o.paymentStatus.toUpperCase()}</div>
                </div>
              </div>

              <div className="grid-2 mb-4" style={{ gap: 24 }}>
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Provider Details</div>
                  <div className="font-bold flex items-center gap-2">
                    <div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{o.provider?.businessName?.[0] || o.provider?.name?.[0]}</div>
                    {o.provider?.businessName || o.provider?.name}
                  </div>
                  <div className="text-sm mt-2 text-muted">A representative will contact you shortly if needed.</div>
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
              <div className="flex justify-between items-center bg-navy p-4 rounded mt-4 border border-navy-border">
                <div className="text-sm">
                  <span className="font-bold text-muted uppercase mr-2">Delivery To:</span> {o.deliveryAddress || 'Default Address'}
                </div>
                {(o.status === 'pending' || o.status === 'confirmed') && (
                  <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(o._id)}>Cancel Order</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
