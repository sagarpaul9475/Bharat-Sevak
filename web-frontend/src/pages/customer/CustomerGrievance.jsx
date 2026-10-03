import { useState, useEffect } from 'react';
import { complaintsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const COMPLAINT_TYPES = [
  { value: 'delivery_issue', label: '🚚 Delivery Issue' },
  { value: 'product_quality', label: '📦 Product Quality' },
  { value: 'service_quality', label: '🛠️ Service Quality' },
  { value: 'payment_issue', label: '💳 Payment Issue' },
  { value: 'rude_behavior', label: '😡 Rude Behavior' },
  { value: 'wrong_item', label: '❌ Wrong Item Delivered' },
  { value: 'not_delivered', label: '📭 Not Delivered' },
  { value: 'other', label: '📝 Other' },
];

const STATUS_MAP = { open: 'pending', in_review: 'confirmed', resolved: 'approved', closed: 'info' };

export default function CustomerGrievance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('new');
  const [myComplaints, setMyComplaints] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    orderId: '', complaintType: '', subject: '', details: '',
  });

  const loadComplaints = async () => {
    setListLoading(true);
    try {
      const res = await complaintsAPI.mine();
      setMyComplaints(res.data);
    } catch { toast.error('Failed to load complaints'); }
    finally { setListLoading(false); }
  };

  useEffect(() => {
    if (tab === 'history') loadComplaints();
  }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.complaintType) { toast.error('Please select a complaint type'); return; }
    setSubmitting(true);
    try {
      const res = await complaintsAPI.file(form);
      toast.success(`Complaint ${res.data.complaintId} filed! Email sent to admin & provider.`);
      setForm({ orderId: '', complaintType: '', subject: '', details: '' });
      setTab('history');
      loadComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📢 Grievance & Complaints</h1>
          <p className="page-subtitle">Report any issue with your orders or services. We take complaints seriously.</p>
        </div>
      </div>

      <div className="tabs mb-6">
        <button className={`tab-btn ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>📝 File a Complaint</button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📋 My Complaints</button>
      </div>

      {tab === 'new' && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="card">
            <div style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>📧</span>
              <div className="text-sm">
                <div className="font-bold" style={{ color: 'var(--saffron)' }}>Email Notification</div>
                <div className="text-muted">Your complaint will be emailed to the Admin and the concerned Provider automatically.</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label className="form-label">Order ID (optional)</label>
                <input className="form-input" placeholder="e.g. BS-000001" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Complaint Type *</label>
                <select className="form-select" value={form.complaintType} onChange={e => setForm({ ...form, complaintType: e.target.value })} required>
                  <option value="">— Select Type —</option>
                  {COMPLAINT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label className="form-label">Subject *</label>
                <input className="form-input" placeholder="Short summary of your complaint" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required maxLength={120} />
              </div>
              <div className="form-group full">
                <label className="form-label">Details *</label>
                <textarea className="form-textarea" style={{ minHeight: 130 }} placeholder="Describe what happened in detail — when, what went wrong, what you expected..." value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} required minLength={20} />
              </div>
              <div className="form-group full">
                <button type="submit" className="btn btn-primary w-full justify-center" style={{ padding: 14, fontSize: 15 }} disabled={submitting}>
                  {submitting ? '⏳ Submitting...' : '📢 Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {listLoading ? <div className="loading-center"><div className="spinner" /></div> : (
            myComplaints.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-title">No complaints filed</div>
                <div className="empty-text">You haven't filed any grievances yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
                {myComplaints.map(c => (
                  <div key={c._id} className="card" style={{ borderLeft: `4px solid ${c.status === 'resolved' ? 'var(--emerald)' : c.status === 'in_review' ? 'var(--active)' : 'var(--saffron)'}` }}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold" style={{ color: 'var(--saffron)' }}>{c.complaintId}</h3>
                          <span className={`badge badge-${STATUS_MAP[c.status] || 'pending'}`}>{c.status.replace('_', ' ')}</span>
                        </div>
                        <div className="font-semibold">{c.subject}</div>
                        <div className="text-xs text-muted mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                      {c.orderId && <div className="badge badge-info">Order: {c.orderId}</div>}
                    </div>

                    <div className="grid-2" style={{ gap: 16 }}>
                      <div>
                        <div className="text-xs text-muted font-bold uppercase mb-1">Type</div>
                        <div className="text-sm">{COMPLAINT_TYPES.find(t => t.value === c.complaintType)?.label || c.complaintType}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted font-bold uppercase mb-1">Email Sent</div>
                        <div className="text-sm">
                          {c.emailSentToAdmin && <span className="badge badge-approved mr-2">Admin ✓</span>}
                          {c.emailSentToProvider && <span className="badge badge-approved">Provider ✓</span>}
                          {!c.emailSentToAdmin && !c.emailSentToProvider && <span className="text-muted">—</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-3 rounded" style={{ background: 'var(--navy)', border: '1px solid var(--navy-border)', fontSize: 13 }}>
                      <div className="text-xs text-muted font-bold uppercase mb-1">Your Complaint</div>
                      <div style={{ lineHeight: 1.6 }}>{c.details}</div>
                    </div>

                    {c.adminNote && (
                      <div className="mt-3 p-3 rounded" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13 }}>
                        <div className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--emerald)' }}>Admin Response</div>
                        <div style={{ lineHeight: 1.6 }}>{c.adminNote}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
