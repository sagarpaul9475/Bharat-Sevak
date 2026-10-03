import { useState, useEffect } from 'react';
import { complaintsAPI } from '../../api';
import toast from 'react-hot-toast';

const COMPLAINT_TYPES = {
  delivery_issue: '🚚 Delivery Issue', product_quality: '📦 Product Quality',
  service_quality: '🛠️ Service Quality', payment_issue: '💳 Payment Issue',
  rude_behavior: '😡 Rude Behavior', wrong_item: '❌ Wrong Item',
  not_delivered: '📭 Not Delivered', other: '📝 Other',
};

const STATUS_COLORS = { open: 'pending', in_review: 'confirmed', resolved: 'approved', closed: 'info' };

export default function AdminGrievances() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await complaintsAPI.all({ status: statusFilter || undefined });
      setComplaints(res.data);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openDetail = (c) => {
    setSelected(c);
    setNote(c.adminNote || '');
    setNewStatus(c.status);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await complaintsAPI.update(selected._id, { status: newStatus, adminNote: note });
      toast.success('Complaint updated');
      setSelected(null);
      load();
    } catch { toast.error('Failed to update'); } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📢 Grievances</h1>
          <p className="page-subtitle">Review and resolve customer complaints</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        {['', 'open', 'in_review', 'resolved', 'closed'].map(s => (
          <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(s)}>
            {s ? s.replace('_', ' ').toUpperCase() : 'ALL'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          complaints.length === 0 ? <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">No complaints found</div></div> :
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Complaint ID</th><th>Customer</th><th>Order ID</th><th>Type</th><th>Subject</th><th>Status</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 700, color: 'var(--saffron)' }}>{c.complaintId}</td>
                    <td>
                      <div className="font-semibold">{c.customer?.name}</div>
                      <div className="text-xs text-muted">{c.customer?.email}</div>
                    </td>
                    <td>{c.orderId || '—'}</td>
                    <td className="text-sm">{COMPLAINT_TYPES[c.complaintType] || c.complaintType}</td>
                    <td style={{ maxWidth: 200 }} className="truncate">{c.subject}</td>
                    <td><span className={`badge badge-${STATUS_COLORS[c.status]}`}>{c.status.replace('_', ' ')}</span></td>
                    <td className="text-sm text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetail(c)}>View & Respond</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setSelected(null)}>
          <div className="modal-box wide">
            <div className="modal-head">
              <h2>{selected.complaintId} — {selected.subject}</h2>
              <button className="btn-icon btn-secondary" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="grid-2 mb-4" style={{ gap: 20 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="text-xs font-bold text-muted uppercase mb-3">Customer Info</div>
                <div className="font-bold">{selected.customer?.name}</div>
                <div className="text-sm mt-1">📧 {selected.customer?.email}</div>
                <div className="text-sm mt-1">📞 {selected.customer?.phone || '—'}</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div className="text-xs font-bold text-muted uppercase mb-3">Complaint Details</div>
                <div className="text-sm mb-1"><strong>Type:</strong> {COMPLAINT_TYPES[selected.complaintType]}</div>
                {selected.orderId && <div className="text-sm mb-1"><strong>Order:</strong> {selected.orderId}</div>}
                {selected.provider && <div className="text-sm"><strong>Provider:</strong> {selected.provider?.businessName || selected.provider?.name}</div>}
              </div>
            </div>

            <div className="card mb-4" style={{ padding: 16 }}>
              <div className="text-xs font-bold text-muted uppercase mb-2">Customer's Statement</div>
              <p style={{ lineHeight: 1.7, fontSize: 14 }}>{selected.details}</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Update Status</label>
                <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group full">
                <label className="form-label">Admin Response / Note</label>
                <textarea className="form-textarea" placeholder="Write your response to the customer..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="form-group full">
                <button className="btn btn-primary w-full justify-center" style={{ padding: 12 }} onClick={handleUpdate} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Update Complaint'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
