import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: 'pending', confirmed: 'confirmed', in_progress: 'confirmed', completed: 'approved', cancelled: 'rejected', rejected: 'rejected' };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllOrders({ status: statusFilter });
      setOrders(res.data.orders); setTotal(res.data.total);
    } catch { toast.error('Failed to load orders'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 All Orders ({total})</h1>
          <p className="page-subtitle">Platform-wide order management</p>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
          {['', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'].map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          orders.length === 0 ? <div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">No orders</div></div> :
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Provider</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 700, color: 'var(--saffron)' }}>{o.orderId}</td>
                    <td><div style={{ fontWeight: 600 }}>{o.customer?.name || '—'}</div><div className="text-xs text-muted">{o.customer?.phone}</div></td>
                    <td>{o.provider?.businessName || o.provider?.name || '—'}</td>
                    <td>{o.items?.length || 0} item(s)</td>
                    <td style={{ fontWeight: 600 }}>₹{o.totalAmount}</td>
                    <td><span className={`badge badge-${o.paymentStatus === 'paid' ? 'approved' : 'pending'}`}>{o.paymentStatus}</span></td>
                    <td><span className={`badge badge-${STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                    <td className="text-sm text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
