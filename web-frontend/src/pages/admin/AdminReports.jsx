import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [sales, setSales] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getSalesReport(), adminAPI.getProviderReport()])
      .then(([s, p]) => { setSales(s.data); setProviders(p.data); })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
  const totalOrders = sales.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Reports</h1>
          <p className="page-subtitle">Platform performance and financial overview</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><span style={{ fontSize: 22 }}>💰</span></div>
          <div><div className="stat-value" style={{ color: 'var(--emerald)' }}>₹{totalRevenue.toLocaleString()}</div><div className="stat-label">Total Revenue (Completed Orders)</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><span style={{ fontSize: 22 }}>🧾</span></div>
          <div><div className="stat-value">{totalOrders}</div><div className="stat-label">Completed Orders</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,107,0,0.15)' }}><span style={{ fontSize: 22 }}>🏪</span></div>
          <div><div className="stat-value" style={{ color: 'var(--saffron)' }}>{providers.length}</div><div className="stat-label">Active Providers</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Monthly Sales */}
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>📈 Monthly Sales</h2>
          {sales.length === 0 ? <div className="empty-state"><div className="empty-icon">📈</div><div className="empty-title">No completed orders yet</div></div> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Month</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  {[...sales].reverse().map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{monthNames[s._id.month]} {s._id.year}</td>
                      <td>{s.count}</td>
                      <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{s.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Providers */}
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>🏆 Top Providers</h2>
          {providers.length === 0 ? <div className="empty-state"><div className="empty-icon">🏪</div><div className="empty-title">No provider data yet</div></div> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>#</th><th>Provider</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  {providers.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: i < 3 ? 'var(--saffron)' : 'inherit' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.provider?.businessName || p.provider?.name || '—'}</td>
                      <td>{p.totalOrders}</td>
                      <td style={{ color: 'var(--emerald)', fontWeight: 700 }}>₹{p.totalRevenue?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
