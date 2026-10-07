import { useEffect, useState } from 'react';
import { providerAPI } from '../../api';
import toast from 'react-hot-toast';

const STATUS_MAP = { open: 'pending', in_review: 'confirmed', resolved: 'approved', closed: 'info' };

export default function ProviderQueries() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', details: '' });
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('new');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await providerAPI.getQueries();
      setQueries(data || []);
    } catch {
      toast.error('Could not load your queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (tab === 'history') load(); }, [tab]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await providerAPI.createQuery(form);
      toast.success('Query ' + data.queryId + ' sent to admin. Email + admin panel notification created.');
      setForm({ subject: '', details: '' });
      setTab('history');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit query');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Admin Support</h1>
          <p className="page-subtitle">Send a question or issue directly to the Bharat Sevak administration.</p>
        </div>
      </div>

      <div className="tabs mb-6">
        <button className={'tab-btn ' + (tab === 'new' ? 'active' : '')} onClick={() => setTab('new')}>📝 New Query</button>
        <button className={'tab-btn ' + (tab === 'history' ? 'active' : '')} onClick={() => { setTab('history'); load(); }}>📋 My Queries</button>
      </div>

      {tab === 'new' ? (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="card">
            <div style={{ background: 'rgba(255,107,0,.08)', border: '1px solid rgba(255,107,0,.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 22 }}>📧</span>
              <div className="text-sm">
                <div className="font-bold" style={{ color: 'var(--saffron)' }}>Admin will receive this in two places</div>
                <div className="text-muted">Your query is saved in the admin panel and emailed to the configured admin email address.</div>
              </div>
            </div>
            <form className="form-grid" onSubmit={submit}>
              <div className="form-group full">
                <label className="form-label">Subject *</label>
                <input className="form-input" maxLength={160} value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Payment settlement question" required />
              </div>
              <div className="form-group full">
                <label className="form-label">Your Query *</label>
                <textarea className="form-textarea" style={{ minHeight: 170 }} maxLength={5000}
                  value={form.details} onChange={e => setForm({ ...form, details: e.target.value })}
                  placeholder="Explain your question or issue clearly..." required minLength={10} />
              </div>
              <div className="form-group full">
                <button className="btn btn-primary w-full justify-center" style={{ padding: 14 }} disabled={submitting}>
                  {submitting ? '⏳ Sending...' : '📨 Send Query to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {loading ? <div className="loading-center"><div className="spinner" /></div> : queries.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">No queries yet</div></div>
          ) : queries.map(q => (
            <div key={q._id} className="card mb-4" style={{ borderLeft: '4px solid var(--saffron)' }}>
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <strong style={{ color: 'var(--saffron)' }}>{q.queryId}</strong>
                    <span className={'badge badge-' + (STATUS_MAP[q.status] || 'pending')}>{q.status.replace('_', ' ')}</span>
                  </div>
                  <h3 style={{ marginTop: 6 }}>{q.subject}</h3>
                  <div className="text-xs text-muted mt-1">{new Date(q.createdAt).toLocaleString()}</div>
                </div>
                {q.emailSentToAdmin && <span className="badge badge-approved">Admin email ✓</span>}
              </div>
              <div className="p-3 rounded" style={{ background: 'var(--navy)', border: '1px solid var(--navy-border)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {q.details}
              </div>
              {q.adminReply && (
                <div className="mt-3 p-3 rounded" style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', fontSize: 13, lineHeight: 1.65 }}>
                  <div className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--emerald)' }}>Admin Response</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{q.adminReply}</div>
                  {q.repliedAt && <div className="text-xs text-muted mt-2">{new Date(q.repliedAt).toLocaleString()}</div>}
                  {q.emailSentToProvider && <div className="text-xs mt-2" style={{ color: 'var(--emerald)' }}>📧 Response emailed to you</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
