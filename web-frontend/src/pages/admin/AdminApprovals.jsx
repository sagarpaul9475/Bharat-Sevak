import { useEffect, useState } from 'react';
import { adminAPI, uploadAPI } from '../../api';
import toast from 'react-hot-toast';

export default function AdminApprovals() {
  const [tab, setTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, pr, sv] = await Promise.all([adminAPI.getPendingProviders(), adminAPI.getPendingProducts(), adminAPI.getPendingServices()]);
      setProviders(p.data); setProducts(pr.data); setServices(sv.data);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDocument = async (providerId, category, doc) => {
    try {
      const response = await uploadAPI.downloadDocument(providerId, category, doc.filename);
      const url = URL.createObjectURL(response.data);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.originalName || doc.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not open document. It may need to be uploaded again.');
    }
  };

  const approveProvider = async (id) => {
    try { await adminAPI.approveProvider(id); toast.success('Provider approved'); load(); } catch { toast.error('Failed'); }
  };
  const rejectProvider = async (id) => {
    try { await adminAPI.rejectProvider(id); toast.success('Provider rejected'); load(); } catch { toast.error('Failed'); }
  };
  const approveProduct = async (id) => {
    try { await adminAPI.approveProduct(id); toast.success('Product approved'); load(); } catch { toast.error('Failed'); }
  };
  const rejectProduct = async (id) => {
    const reason = prompt('Rejection reason (optional):') || '';
    try { await adminAPI.rejectProduct(id, reason); toast.success('Product rejected'); load(); } catch { toast.error('Failed'); }
  };
  const approveService = async (id) => {
    try { await adminAPI.approveService(id); toast.success('Service approved'); load(); } catch { toast.error('Failed'); }
  };
  const rejectService = async (id) => {
    const reason = prompt('Rejection reason:') || '';
    try { await adminAPI.rejectService(id, reason); toast.success('Service rejected'); load(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">✅ Approvals</h1>
          <p className="page-subtitle">Review and approve providers, products, and services</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab-btn ${tab === 'providers' ? 'active' : ''}`} onClick={() => setTab('providers')}>
          🏪 Providers {providers.length > 0 && <span className="nav-badge">{providers.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          📦 Products {products.length > 0 && <span className="nav-badge">{products.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'services' ? 'active' : ''}`} onClick={() => setTab('services')}>
          🛠️ Services {services.length > 0 && <span className="nav-badge">{services.length}</span>}
        </button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        <div className="card">
          {tab === 'providers' && (
            providers.length === 0 ? <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">No pending providers</div></div> :
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Business</th><th>Type</th><th>Phone</th><th>Region</th><th>Registered</th><th>Actions</th></tr></thead>
                <tbody>
                  {providers.map(p => (
                    <tr key={p._id}>
                      <td><div style={{ fontWeight: 600 }}>{p.name}</div><div className="text-sm text-muted">{p.email}</div></td>
                      <td>{p.businessName || '—'}</td>
                      <td><span className="badge badge-info">{p.providerType}</span></td>
                      <td>{p.phone}</td>
                      <td className="text-sm text-muted">{[p.region?.area, p.region?.district, p.region?.state].filter(Boolean).join(', ') || '—'}</td>
                      <td className="text-sm text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={() => approveProvider(p._id)}>✅ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectProvider(p._id)}>❌ Reject</button>
                        </div>
                      </td>
                    </tr>
                    <tr key={`${p._id}-documents`}>
                      <td colSpan={7}>
                        <div className="grid-2" style={{ gap: 16, padding: '8px 0' }}>
                          <div>
                            <div className="font-bold mb-2">Identity / KYC documents</div>
                            {p.kycDocs?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {p.kycDocs.map((doc) => (
                                  <button key={doc._id || doc.filename} className="btn btn-secondary btn-sm" onClick={() => openDocument(p._id, 'kyc', doc)}>
                                    📄 {doc.originalName || doc.docType || 'Identity document'}
                                  </button>
                                ))}
                              </div>
                            ) : <span className="text-sm text-muted">No identity document submitted</span>}
                          </div>
                          <div>
                            <div className="font-bold mb-2">Business verification documents</div>
                            {p.businessDocs?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {p.businessDocs.map((doc) => (
                                  <button key={doc._id || doc.filename} className="btn btn-secondary btn-sm" onClick={() => openDocument(p._id, 'business', doc)}>
                                    🏪 {doc.originalName || doc.docType || 'Business proof'}
                                  </button>
                                ))}
                              </div>
                            ) : <span className="text-sm text-muted">No business proof submitted</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'products' && (
            products.length === 0 ? <div className="empty-state"><div className="empty-icon">📦</div><div className="empty-title">No pending products</div></div> :
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Product</th><th>Provider</th><th>Category</th><th>Price</th><th>Submitted</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id}>
                      <td><div style={{ fontWeight: 600 }}>{p.name}</div><div className="text-sm text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div></td>
                      <td>{p.provider?.businessName || p.provider?.name || '—'}</td>
                      <td>{p.categoryName || '—'}</td>
                      <td style={{ color: 'var(--saffron)', fontWeight: 600 }}>₹{p.price}</td>
                      <td className="text-sm text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={() => approveProduct(p._id)}>✅</button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectProduct(p._id)}>❌</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'services' && (
            services.length === 0 ? <div className="empty-state"><div className="empty-icon">🛠️</div><div className="empty-title">No pending services</div></div> :
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Service</th><th>Provider</th><th>Type</th><th>Rate</th><th>Submitted</th><th>Actions</th></tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.provider?.businessName || s.provider?.name || '—'}</td>
                      <td>{s.serviceTypeName || '—'}</td>
                      <td style={{ color: 'var(--saffron)', fontWeight: 600 }}>₹{s.rate}/{s.rateUnit}</td>
                      <td className="text-sm text-muted">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={() => approveService(s._id)}>✅</button>
                          <button className="btn btn-danger btn-sm" onClick={() => rejectService(s._id)}>❌</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
