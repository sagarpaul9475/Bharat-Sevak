import { useEffect, useState } from 'react';
import { providerAPI } from '../../api';
import toast from 'react-hot-toast';

export default function ProviderOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = () => {
    setLoading(true);
    providerAPI.getOrders({ status: filter || undefined }).then(r => setOrders(r.data.orders))
      .catch(() => toast.error('Failed to load orders')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await providerAPI.updateOrderStatus(id, { status });
      toast.success('Order status updated');
      load();
    } catch { toast.error('Failed to update'); }
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
          <h1 className="page-title">🧾 Orders</h1>
          <p className="page-subtitle">Manage incoming customer requests</p>
        </div>
      </div>

      <div className="tabs mb-4">
        {['pending', 'confirmed', 'in_progress', 'completed', 'rejected', ''].map(s => (
          <button key={s} className={`tab-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s ? s.replace('_', ' ').toUpperCase() : 'ALL'}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        orders.length === 0 ? <div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">No orders found</div></div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(o => (
            <div key={o._id} className="card" style={{ borderLeft: `4px solid ${getStatusColor(o.status)}` }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg" style={{ color: 'var(--saffron)' }}>{o.orderId}</h3>
                    <span className={`badge badge-${o.status === 'in_progress' ? 'confirmed' : o.status === 'cancelled' ? 'rejected' : o.status}`}>{o.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-sm text-muted">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 24, fontWeight: 800 }}>₹{o.totalAmount}</div>
                  <div className={`text-xs font-bold text-${o.paymentStatus === 'paid' ? 'emerald' : 'pending'}`}>{o.paymentStatus.toUpperCase()} ({o.paymentMethod})</div>
                </div>
              </div>

              <div className="grid-2 mb-4" style={{ gap: 24, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Customer Details</div>
                  <div className="font-medium">{o.customer?.name}</div>
                  <div className="text-sm mt-1">📞 {o.customer?.phone}</div>
                  {o.deliveryAddress && <div className="text-sm mt-1">📍 {o.deliveryAddress}</div>}
                  {o.notes && <div className="text-sm mt-2 p-2 rounded" style={{ background: 'var(--navy-border)' }}><strong>Note:</strong> {o.notes}</div>}
                </div>
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Items</div>
                  {o.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-sm mb-1">
                      <span>{i.quantity}x {i.itemName}</span>
                      <span className="font-medium">₹{i.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions based on status */}
              <div className="flex gap-2 justify-end" style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 16 }}>
                {o.status === 'pending' && (
                  <>
                    <button className="btn btn-danger" onClick={() => updateStatus(o._id, 'rejected')}>❌ Reject</button>
                    <button className="btn btn-success" onClick={() => updateStatus(o._id, 'confirmed')}>✅ Accept & Confirm</button>
                  </>
                )}
                {o.status === 'confirmed' && <button className="btn btn-primary" onClick={() => updateStatus(o._id, 'in_progress')}>🚀 Mark In Progress</button>}
                {o.status === 'in_progress' && <button className="btn btn-success" onClick={() => updateStatus(o._id, 'completed')}>🏁 Mark Completed</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
