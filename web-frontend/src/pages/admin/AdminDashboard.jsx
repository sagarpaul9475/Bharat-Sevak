import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postOfficeCharge, setPostOfficeCharge] = useState(50);
  const [savingCharge, setSavingCharge] = useState(false);

  const load = () => {
    adminAPI.getDashboard()
      .then(r => {
        setData(r.data);
        if (typeof r.data.postOfficeDeliveryCharge === 'number') {
          setPostOfficeCharge(r.data.postOfficeDeliveryCharge);
        }
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdateCharge = async (e) => {
    e.preventDefault();
    const val = Number(postOfficeCharge);
    if (!Number.isFinite(val) || val < 0) {
      toast.error('Please enter a valid non-negative amount');
      return;
    }
    setSavingCharge(true);
    try {
      await adminAPI.updateDeliverySettings({ postOfficeDeliveryCharge: val });
      toast.success(`Post office delivery charge updated to ₹${val}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update delivery charge');
    } finally {
      setSavingCharge(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;

  const stats = [
    { icon: '👥', label: 'Total Users', value: data?.users || 0, color: '#3B82F6' },
    { icon: '🏪', label: 'Providers', value: data?.providers || 0, color: '#FF6B00' },
    { icon: '🛒', label: 'Customers', value: data?.customers || 0, color: '#10B981' },
    { icon: '📦', label: 'Products Listed', value: data?.products || 0, color: '#8B5CF6' },
    { icon: '🛠️', label: 'Services', value: data?.services || 0, color: '#EC4899' },
    { icon: '🧾', label: 'Total Orders', value: data?.orders || 0, color: '#F59E0B' },
    { icon: '⏳', label: 'Pending Approvals', value: (data?.pendingProviders || 0) + (data?.pendingProducts || 0), color: '#EF4444' },
    { icon: '💰', label: 'Total Revenue', value: `₹${data?.revenue || 0}`, color: '#10B981' },
  ];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏠 Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and management controls</p>
        </div>
        <Link to="/admin/approvals" className="btn btn-primary">
          ✅ Review Approvals {(data?.pendingProviders + data?.pendingProducts) > 0 && <span className="nav-badge">{data.pendingProviders + data.pendingProducts}</span>}
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}20` }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Post Office Delivery Charge Settings Card */}
      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(15,23,42,0.95))', border: '1px solid rgba(245,158,11,0.3)' }}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 24 }}>📮</span>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Post Office Delivery Charge (Manual Setting)</h2>
            </div>
            <p className="text-sm text-muted" style={{ maxWidth: 640 }}>
              Set the standard delivery fee charged when customers select <strong>Post Office / Postal Service</strong> at checkout.
              This charge is automatically displayed to the customer and added to the order's total amount.
            </p>
          </div>
          <form onSubmit={handleUpdateCharge} className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--navy)', border: '1px solid var(--navy-border)', borderRadius: 8, padding: '4px 12px' }}>
              <span style={{ color: 'var(--saffron)', fontWeight: 700, marginRight: 6 }}>₹</span>
              <input
                type="number"
                min="0"
                step="1"
                className="form-input"
                style={{ width: 100, border: 'none', background: 'transparent', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}
                value={postOfficeCharge}
                onChange={e => setPostOfficeCharge(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingCharge}>
              {savingCharge ? '⏳ Saving...' : '💾 Save Charge'}
            </button>
          </form>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <Link to="/admin/approvals" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Provider Approvals</h3>
          <p className="text-muted text-sm">Approve or reject new provider registrations</p>
          {data?.pendingProviders > 0 && <div className="badge badge-pending" style={{ marginTop: 10 }}>{data.pendingProviders} pending</div>}
        </Link>
        <Link to="/admin/menu-manager" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Menu Manager</h3>
          <p className="text-muted text-sm">Add/edit unlimited nested product & service categories</p>
        </Link>
        <Link to="/admin/reports" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Reports</h3>
          <p className="text-muted text-sm">View sales, provider performance, and payment reports</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 18 }}>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        {data?.recentOrders?.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">No orders yet</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Provider</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {data?.recentOrders?.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600 }}>{o.orderId}</td>
                    <td>{o.customer?.name || '—'}</td>
                    <td>{o.provider?.businessName || o.provider?.name || '—'}</td>
                    <td style={{ color: 'var(--saffron)', fontWeight: 600 }}>₹{o.totalAmount}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
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
