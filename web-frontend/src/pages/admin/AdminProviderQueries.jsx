import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

const STATUS_MAP = { open: 'pending', in_review: 'confirmed', resolved: 'approved', closed: 'info' };

export default function AdminProviderQueries() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('open');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getProviderQueries({ status: statusFilter || undefined });
      setQueries(data || []);
    } catch {
      toast.error('Could not load provider queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openQuery = q => {
    setSelected(q);
    setReply(q.adminReply || '');
    setStatus(q.status);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateProviderQuery(selected._id, { status, adminReply: reply });
      toast.success('Provider query updated. Response was emailed + notified in-app.');
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update query');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📨 Provider Queries</h1>
          <p className="page-subtitle">Questions and support requests sent by providers.</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        {['', 'open', 'in_review', 'resolved', 'closed'].map(value => (
          <button key={value} className={'btn btn-sm ' + (statusFilter === value ? 'btn-primary' : 'btn-secondary')} onClick={() => setStatusFilter(value)}>
            {value ? value.replace('_', ' ').toUpperCase() : 'ALL'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : queries.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📨</div><div className="empty-title">No provider queries</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Query</th><th>Provider</th><th>Subject</th><th>Status</th><th>Email</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {queries.map(q => (
                  <tr key={q._id}>
                    <td style={{ fontWeight: 700, color: 'var(--saffron)' }}>{q.queryId}</td>
                    <td>
                      <div className="font-semibold">{q.provider?.businessName || q.provider?.name || '—'}</div>
                      <div className="text-xs text-muted">{q.provider?.email || '—'}</div>
                    </td>
                    <td className="truncate" style={{ maxWidth: 230 }}>{q.subject}</td>
                    <td><span className={'badge badge-' + (STATUS_MAP[q.status] || 'pending')}>{q.status.replace('_', ' ')}</span></td>
                    <td>{q.emailSentToAdmin ? '✓' : '—'}</td>
                    <td className="text-xs text-muted">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => openQuery(q)}>View & Respond</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target.classList.contains('modal-overlay') && setSelected(null)}>
          <div className="modal-box wide">
            <div className="modal-head">
              <h2>{selected.queryId} — {selected.subject}</h2>
              <button className="btn-icon btn-secondary" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="grid-2 mb-4" style={{ gap: 20 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="text-xs font-bold text-muted uppercase mb-2">Provider</div>
                <div className="font-bold">{selected.provider?.businessName || selected.provider?.name}</div>
                <div className="text-sm mt-1">📧 {selected.provider?.email}</div>
                <div className="text-sm mt-1">📞 {selected.provider?.phone || '—'}</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div className="text-xs font-bold text-muted uppercase mb-2">Query</div>
                <div className="text-sm" style={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selected.details}</div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group full">
                <label className="form-label">Reply to Provider</label>
                <textarea className="form-textarea" style={{ minHeight: 140 }} value={reply}
                  onChange={e => setReply(e.target.value)} placeholder="Write your response. It will be emailed to the provider and appear in their query history." />
              </div>
              <div className="form-group full">
                <button className="btn btn-primary w-full justify-center" style={{ padding: 13 }} disabled={saving} onClick={save}>
                  {saving ? '⏳ Saving...' : '💾 Save & Send Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
