import { useEffect, useState } from 'react';
import { providerAPI, customerAPI } from '../../api';
import toast from 'react-hot-toast';

export default function ProviderServices() {
  const [services, setServices] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', rate: '', rateUnit: 'day', serviceType: '', serviceTypeName: '', location: '', radius: 5, availability: 'Mon-Sat, 9am-6pm' });

  const load = () => {
    setLoading(true);
    Promise.all([providerAPI.getServices(), customerAPI.getMenus()])
      .then(([s, m]) => { setServices(s.data); setMenus(m.data.filter(x => x.type === 'service_type')); })
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, rate: Number(form.rate), radius: Number(form.radius) };
    try {
      if (editingId) { await providerAPI.updateService(editingId, payload); toast.success('Service updated (sent for approval)'); }
      else { await providerAPI.addService(payload); toast.success('Service added (sent for approval)'); }
      setShowModal(false); load();
    } catch { toast.error('Failed to save'); }
  };

  const handleEdit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name, description: s.description, rate: s.rate, rateUnit: s.rateUnit, serviceType: s.serviceType || '', serviceTypeName: s.serviceTypeName || '', location: s.location, radius: s.radius, availability: s.availability });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    try { await providerAPI.deleteService(id); toast.success('Deleted'); load(); } catch { toast.error('Failed to delete'); }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', rate: '', rateUnit: 'day', serviceType: '', serviceTypeName: '', location: '', radius: 5, availability: 'Mon-Sat, 9am-6pm' });
    setShowModal(true);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛠️ My Services</h1>
          <p className="page-subtitle">Manage the services you offer</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>➕ Add Service</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        services.length === 0 ? <div className="empty-state"><div className="empty-icon">🛠️</div><div className="empty-title">No services yet</div><button className="btn btn-primary mt-4" onClick={openNew}>➕ Add your first service</button></div> :
        <div className="grid-3">
          {services.map(s => (
            <div key={s._id} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg truncate">{s.name}</h3>
                <span className={`badge badge-${s.status}`}>{s.status}</span>
              </div>
              <div className="text-sm text-muted mb-3 truncate">{s.serviceTypeName || 'Uncategorized'}</div>
              <div className="mb-4" style={{ fontSize: 22, fontWeight: 700, color: 'var(--saffron)' }}>
                ₹{s.rate} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/ {s.rateUnit}</span>
              </div>
              <div className="text-sm text-muted mb-4">
                <div className="mb-1">📍 {s.location || 'Your Region'} ({s.radius}km radius)</div>
                <div>🕒 {s.availability}</div>
              </div>

              {s.status === 'rejected' && s.rejectionReason && (
                <div style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: 4, marginBottom: 12 }}>
                  <strong>Reason:</strong> {s.rejectionReason}
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm flex-1 justify-center" onClick={() => handleEdit(s)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ padding: '6px 12px' }} onClick={() => handleDelete(s._id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h2>{editingId ? 'Edit Service' : 'Add Service'}</h2>
              <button className="btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group full">
                <label className="form-label">Service Title *</label>
                <input className="form-input" placeholder="e.g. Expert Home Plumber" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group full">
                <label className="form-label">Category / Type *</label>
                <select className="form-select" value={form.serviceType} onChange={e => {
                  const sel = e.target.options[e.target.selectedIndex];
                  setForm({ ...form, serviceType: e.target.value, serviceTypeName: sel.text });
                }} required>
                  <option value="">— Select Type —</option>
                  {menus.map(m => <option key={m._id} value={m._id}>{'—'.repeat(m.level)} {m.icon} {m.name}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Detail your experience and what's included..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Rate (₹) *</label>
                <input className="form-input" type="number" min="0" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Rate Unit *</label>
                <select className="form-select" value={form.rateUnit} onChange={e => setForm({ ...form, rateUnit: e.target.value })}>
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                  <option value="job">Per Job/Task</option>
                  <option value="session">Per Session</option>
                  <option value="month">Per Month</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Base Location</label>
                <input className="form-input" placeholder="e.g. Kolkata North" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Service Radius (km)</label>
                <input className="form-input" type="number" min="1" value={form.radius} onChange={e => setForm({ ...form, radius: e.target.value })} />
              </div>
              <div className="form-group full">
                <label className="form-label">Availability / Timings</label>
                <input className="form-input" placeholder="e.g. Mon-Sat, 9am-6pm" value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} />
              </div>
              <div className="form-group full mt-2">
                <button type="submit" className="btn btn-primary w-full" style={{ padding: 12, justifyContent: 'center' }}>
                  {editingId ? '💾 Save Changes' : '➕ Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
