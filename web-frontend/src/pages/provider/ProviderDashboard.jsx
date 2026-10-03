import { useEffect, useState } from 'react';
import { providerAPI } from '../../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProviderDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    providerAPI.getDashboard().then(r => setData(r.data)).catch(() => toast.error('Failed to load dashboard')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;

  const stats = [
    { icon: '📦', label: 'My Products', value: data?.products || 0, color: '#8B5CF6' },
    { icon: '🛠️', label: 'My Services', value: data?.services || 0, color: '#EC4899' },
    { icon: '🧾', label: 'Total Orders', value: data?.totalOrders || 0, color: '#3B82F6' },
    { icon: '⏳', label: 'Pending Orders', value: data?.pendingOrders || 0, color: '#F59E0B' },
    { icon: '✅', label: 'Completed Orders', value: data?.completedOrders || 0, color: '#10B981' },
    { icon: '🧑‍🤝‍🧑', label: 'Unique Customers', value: data?.uniqueCustomers || 0, color: '#8B5CF6' },
    { icon: '💰', label: 'Total Revenue', value: `₹${data?.revenue || 0}`, color: '#10B981' },
  ];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏪 Provider Dashboard</h1>
          <p className="page-subtitle">Manage your business, orders, and services</p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}20` }}><span style={{ fontSize: 22 }}>{s.icon}</span></div>
            <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <Link to="/provider/products" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Manage Products</h3>
          <p className="text-muted text-sm">Add or edit your physical products and track stock</p>
        </Link>
        <Link to="/provider/services" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛠️</div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Manage Services</h3>
          <p className="text-muted text-sm">List your service offerings (tuition, repair, etc.)</p>
        </Link>
        <Link to="/provider/orders" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>View Orders</h3>
          <p className="text-muted text-sm">Process incoming orders and update status</p>
          {data?.pendingOrders > 0 && <div className="badge badge-pending" style={{ marginTop: 10 }}>{data.pendingOrders} pending</div>}
        </Link>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 18 }}>Recent Orders</h2>
            <Link to="/provider/orders" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {data?.recentOrders?.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">No orders yet</div></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {data?.recentOrders?.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontWeight: 600 }}>{o.orderId}</td>
                      <td><div>{o.customer?.name}</div><div className="text-xs text-muted">{o.customer?.phone}</div></td>
                      <td style={{ color: 'var(--saffron)', fontWeight: 600 }}>₹{o.totalAmount}</td>
                      <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 18 }}>Discover Co-Providers</h2>
            <Link to="/provider/co-providers" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {data?.coProviders?.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🤝</div><div className="empty-title">No co-providers found</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data?.coProviders?.map(p => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--navy)', borderRadius: 8, border: '1px solid var(--navy-border)' }}>
                  <div className="avatar" style={{ background: '#3B82F6' }}>{p.businessName?.[0]?.toUpperCase() || p.name?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.businessName || p.name}</div>
                    <div className="text-xs text-muted">{[p.region?.area, p.region?.district].filter(Boolean).join(', ')}</div>
                  </div>
                  <span className="badge badge-info">{p.providerType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
