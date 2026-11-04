import { useEffect, useState } from 'react';
import { providerAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    providerAPI.getDashboard()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;

  const profile = data?.providerProfile || user;
  const printTimestamp = new Date().toLocaleString();

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
      {/* ── Screen Only View ────────────────────────────────────── */}
      <div className="screen-only-dashboard">
        <div className="page-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">🏪 Provider Dashboard</h1>
            <p className="page-subtitle">Manage your business, orders, and print official performance statements</p>
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPrintModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>📄</span> Statement Preview
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <span>🖨️</span> Print Business Stats
            </button>
          </div>
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

        {/* Payouts card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="flex items-center justify-between" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>💳 Provider payouts</h2>
              <p className="text-sm text-muted">
                Razorpay Route onboarding: {data?.routePayouts?.status || 'not_started'}.
                {' '}Your linked account must be approved and configured before automatic transfers can be enabled.
              </p>
              {!data?.routePayouts?.linkedAccountConfigured && (
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                  No linked account is configured yet. Contact Bharat Sevak support after completing the approved provider onboarding process.
                </p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-value" style={{ color: 'var(--saffron)' }}>
                ₹{(data?.routePayouts?.summary || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2)}
              </div>
              <div className="stat-label">Estimated provider share on paid orders</div>
            </div>
          </div>
          {(data?.routePayouts?.summary || []).length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
              {data.routePayouts.summary.map(item => (
                <span key={item._id || 'unknown'} className="badge badge-info">
                  {String(item._id || 'unassigned').replaceAll('_', ' ')}: {item.orders} order(s)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick action cards */}
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

        {/* Orders & Co-Providers */}
        <div className="grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: 18 }}>Recent Orders</h2>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint}>🖨️ Print Ledger</button>
                <Link to="/provider/orders" className="btn btn-secondary btn-sm">View All</Link>
              </div>
            </div>
            {data?.recentOrders?.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">No orders yet</div></div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {data?.recentOrders?.slice(0, 8).map(o => (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 600 }}>{o.orderId}</td>
                        <td><div>{o.customer?.name || 'Customer'}</div><div className="text-xs text-muted">{o.customer?.phone}</div></td>
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

      {/* ── Official Printable Statement (Hidden on screen, Visible on print) ── */}
      <div className="print-only-statement">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0F172A', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>🇮🇳</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '0.5px', color: '#0F172A' }}>BHARAT SEVAK</h1>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FF6B00', letterSpacing: '1px' }}>
                SERVICE IS OUR RELIGION | HUMANITY IS OUR IDENTITY
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>OFFICIAL BUSINESS STATEMENT</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Generated on: {printTimestamp}</div>
          </div>
        </div>

        {/* Provider Profile Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, border: '1px solid #CBD5E1', borderRadius: 8, padding: 16, marginBottom: 24, background: '#F8FAFC' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Business Enterprise</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {profile?.businessName || profile?.name || 'Bharat Sevak Registered Business'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
              <strong>Proprietor:</strong> {profile?.name || '—'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
              <strong>Business Type:</strong> {profile?.providerType || 'Product & Services'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Contact & Location</div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
              <strong>Phone:</strong> {profile?.phone || '—'} · <strong>Email:</strong> {profile?.email || '—'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
              <strong>Address:</strong> {[profile?.address, profile?.region?.area, profile?.region?.district, profile?.region?.state, profile?.region?.pincode].filter(Boolean).join(', ') || 'Registered Area'}
            </div>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
              <strong>Status:</strong> {profile?.isVerified ? '✅ Verified Provider' : 'Pending Verification'}
            </div>
          </div>
        </div>

        {/* Performance Metrics Table */}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Executive Performance Summary
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <tbody>
            <tr>
              <th style={{ width: '25%', background: '#F1F5F9' }}>Total Revenue (Paid)</th>
              <td style={{ width: '25%', fontWeight: 800, fontSize: 14, color: '#059669' }}>₹{data?.revenue || 0}</td>
              <th style={{ width: '25%', background: '#F1F5F9' }}>Total Orders</th>
              <td style={{ width: '25%', fontWeight: 700 }}>{data?.totalOrders || 0}</td>
            </tr>
            <tr>
              <th style={{ background: '#F1F5F9' }}>Completed Orders</th>
              <td style={{ fontWeight: 700, color: '#059669' }}>{data?.completedOrders || 0}</td>
              <th style={{ background: '#F1F5F9' }}>Pending Orders</th>
              <td style={{ fontWeight: 700, color: '#D97706' }}>{data?.pendingOrders || 0}</td>
            </tr>
            <tr>
              <th style={{ background: '#F1F5F9' }}>Products Listed</th>
              <td>{data?.products || 0} item(s)</td>
              <th style={{ background: '#F1F5F9' }}>Services Offered</th>
              <td>{data?.services || 0} service(s)</td>
            </tr>
            <tr>
              <th style={{ background: '#F1F5F9' }}>Unique Customers</th>
              <td>{data?.uniqueCustomers || 0} customers</td>
              <th style={{ background: '#F1F5F9' }}>Payout Route Status</th>
              <td style={{ textTransform: 'capitalize' }}>{data?.routePayouts?.status || 'Active'}</td>
            </tr>
          </tbody>
        </table>

        {/* Recent Orders Ledger */}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Recent Orders & Transactions Ledger
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#0F172A', color: '#ffffff' }}>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>#</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Order ID</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Customer</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Contact</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Amount</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Payment</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Status</th>
              <th style={{ color: '#ffffff', padding: '8px 10px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {(!data?.recentOrders || data?.recentOrders.length === 0) ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#64748B', padding: 16 }}>No order history recorded yet</td>
              </tr>
            ) : (
              data.recentOrders.map((o, index) => (
                <tr key={o._id}>
                  <td>{index + 1}</td>
                  <td style={{ fontWeight: 700 }}>{o.orderId}</td>
                  <td>{o.customer?.name || 'Customer'}</td>
                  <td>{o.customer?.phone || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#059669' }}>₹{o.totalAmount}</td>
                  <td style={{ textTransform: 'uppercase', fontSize: 11 }}>{o.paymentStatus || 'Pending'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{o.status}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Verification and Sign-off */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, paddingTop: 20, borderTop: '1px solid #CBD5E1' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>Certification</div>
            <p style={{ fontSize: 11, color: '#475569', maxWidth: 440, margin: '4px 0 0 0', lineHeight: 1.5 }}>
              This statement certifies verified platform transactions processed by the Bharat Sevak Network.
              All delivery fulfillment and customer payments are verified via digital OTP and cryptographic transaction IDs.
            </p>
          </div>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ borderBottom: '1.5px solid #0F172A', height: 40, width: 200, margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Provider Signature & Seal</div>
            <div style={{ fontSize: 10, color: '#64748B' }}>Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* ── Statement Preview Modal (On-Screen) ─────────────────── */}
      {showPrintModal && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setShowPrintModal(false)}>
          <div className="modal-box wide" style={{ maxWidth: 840, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <h2>📄 Provider Business Statement Preview</h2>
              <button className="btn-icon btn-secondary" onClick={() => setShowPrintModal(false)}>✕</button>
            </div>

            <div style={{ background: '#ffffff', color: '#0F172A', padding: '24px 28px', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', margin: '16px 0' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0F172A', paddingBottom: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 30 }}>🇮🇳</span>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0F172A' }}>BHARAT SEVAK</h2>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#FF6B00', letterSpacing: '0.5px' }}>
                    SERVICE IS OUR RELIGION | HUMANITY IS OUR IDENTITY
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>BUSINESS STATEMENT</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{printTimestamp}</div>
                </div>
              </div>

              {/* Provider Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, border: '1px solid #E2E8F0', padding: 12, borderRadius: 6, background: '#F8FAFC', marginBottom: 16, fontSize: 13 }}>
                <div>
                  <div><strong>Business:</strong> {profile?.businessName || profile?.name}</div>
                  <div><strong>Proprietor:</strong> {profile?.name || '—'}</div>
                  <div><strong>Type:</strong> {profile?.providerType || 'Both'}</div>
                </div>
                <div>
                  <div><strong>Phone:</strong> {profile?.phone || '—'}</div>
                  <div><strong>Location:</strong> {[profile?.region?.area, profile?.region?.district, profile?.region?.state].filter(Boolean).join(', ') || 'Local area'}</div>
                  <div><strong>Status:</strong> {profile?.isVerified ? '✅ Verified Provider' : 'Pending Verification'}</div>
                </div>
              </div>

              {/* Stats Summary Table */}
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#0F172A', marginBottom: 6 }}>
                  Financial & Operational Highlights
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div style={{ border: '1px solid #E2E8F0', padding: 10, borderRadius: 6, textAlign: 'center', background: '#F0FDF4' }}>
                    <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Total Revenue</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#15803D' }}>₹{data?.revenue || 0}</div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', padding: 10, borderRadius: 6, textAlign: 'center', background: '#EFF6FF' }}>
                    <div style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>Total Orders</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>{data?.totalOrders || 0}</div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', padding: 10, borderRadius: 6, textAlign: 'center', background: '#FAF5FF' }}>
                    <div style={{ fontSize: 11, color: '#6B21A8', fontWeight: 600 }}>Catalog Items</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#7E22CE' }}>{(data?.products || 0) + (data?.services || 0)}</div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', padding: 10, borderRadius: 6, textAlign: 'center', background: '#FFFBEB' }}>
                    <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>Customers</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#B45309' }}>{data?.uniqueCustomers || 0}</div>
                  </div>
                </div>
              </div>

              {/* Recent Orders List */}
              <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#0F172A', marginBottom: 6 }}>
                Recent Transactions Ledger
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#0F172A' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1.5px solid #CBD5E1' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Order ID</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Customer</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Phone</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Amount</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data?.recentOrders || data?.recentOrders.length === 0) ? (
                      <tr><td colSpan={6} style={{ padding: 10, textAlign: 'center', color: '#64748B' }}>No orders yet</td></tr>
                    ) : (
                      data.recentOrders.slice(0, 10).map(o => (
                        <tr key={o._id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700 }}>{o.orderId}</td>
                          <td style={{ padding: '6px 8px' }}>{o.customer?.name || 'Customer'}</td>
                          <td style={{ padding: '6px 8px' }}>{o.customer?.phone || '—'}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 700, color: '#15803D' }}>₹{o.totalAmount}</td>
                          <td style={{ padding: '6px 8px', textTransform: 'capitalize' }}>{o.status}</td>
                          <td style={{ padding: '6px 8px' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-muted">You can save this statement as PDF or print to physical paper.</span>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => { setShowPrintModal(false); setTimeout(() => window.print(), 200); }}>
                  🖨️ Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
