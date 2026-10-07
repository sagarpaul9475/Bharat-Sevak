import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

const emptyForm = {
  title: '',
  message: '',
  channel: 'in_app',
  audience: 'all',
  recipientRole: 'customer',
  recipientUser: '',
};

export default function AdminMessages() {
  const [form, setForm] = useState(emptyForm);
  const [recipients, setRecipients] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const { data } = await adminAPI.getMessageRecipients({
        role: form.audience === 'role' ? form.recipientRole : undefined,
        search: form.audience === 'user' ? search : undefined,
      });
      setRecipients(data || []);
    } catch {
      toast.error('Could not load users');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await adminAPI.getMessageHistory({ limit: 30 });
      setHistory(data || []);
    } catch {
      toast.error('Could not load message history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    if (form.audience === 'user') loadRecipients();
    else setRecipients([]);
  }, [form.audience, form.recipientRole, search]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.audience === 'user' && !form.recipientUser) {
      toast.error('Select a customer or provider');
      return;
    }
    setSending(true);
    try {
      const { data } = await adminAPI.sendMessage(form);
      const emailPart = form.channel === 'in_app'
        ? ''
        : ' Email sent: ' + data.emailSentCount + ', failed: ' + data.emailFailedCount + '.';
      toast.success('Message sent to ' + data.recipientCount + ' recipient(s).' + emailPart);
      setForm(emptyForm);
      setSearch('');
      loadHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📣 Admin Messaging</h1>
          <p className="page-subtitle">Send platform announcements through the in-app bell, email, or both.</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="text-xs font-bold text-muted uppercase mb-3">Compose Message</div>
          <form className="form-grid" onSubmit={submit}>
            <div className="form-group full">
              <label className="form-label">Title *</label>
              <input className="form-input" maxLength={120} value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Platform maintenance tonight" required />
            </div>

            <div className="form-group full">
              <label className="form-label">Message *</label>
              <textarea className="form-textarea" maxLength={5000} style={{ minHeight: 150 }}
                value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Write the announcement or message..." required />
            </div>

            <div className="form-group">
              <label className="form-label">Send Via</label>
              <select className="form-select" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                <option value="in_app">🔔 In-app notification</option>
                <option value="email">📧 Email</option>
                <option value="both">🔔 + 📧 In-app & Email</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Audience</label>
              <select className="form-select" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value, recipientUser: '' })}>
                <option value="all">👥 All customers & providers</option>
                <option value="role">🎯 One user type</option>
                <option value="user">👤 One specific user</option>
              </select>
            </div>

            {form.audience === 'role' && (
              <div className="form-group full">
                <label className="form-label">User Type</label>
                <select className="form-select" value={form.recipientRole} onChange={e => setForm({ ...form, recipientRole: e.target.value })}>
                  <option value="customer">Customers</option>
                  <option value="provider">Providers</option>
                </select>
              </div>
            )}

            {form.audience === 'user' && (
              <div className="form-group full">
                <label className="form-label">Find Customer / Provider</label>
                <input className="form-input mb-2" placeholder="Search name, business or email..." value={search} onChange={e => setSearch(e.target.value)} />
                <select className="form-select" value={form.recipientUser} onChange={e => setForm({ ...form, recipientUser: e.target.value })} required>
                  <option value="">— Select user —</option>
                  {loadingRecipients ? <option disabled>Loading...</option> : recipients.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name}{user.businessName ? ' · ' + user.businessName : ''} · {user.email} · {user.role}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted mt-1">The same message can be delivered to this user's in-app inbox, email, or both.</div>
              </div>
            )}

            <div className="form-group full">
              <button className="btn btn-primary w-full justify-center" style={{ padding: 13 }} disabled={sending}>
                {sending ? '⏳ Sending...' : '📣 Send Message'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold text-muted uppercase">Recent Messages</div>
              <div className="text-sm text-muted mt-1">Your recent admin announcements</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadHistory}>↻ Refresh</button>
          </div>
          {loadingHistory ? <div className="loading-center"><div className="spinner" /></div> : (
            history.length === 0 ? <div className="empty-state"><div className="empty-icon">📣</div><div className="empty-title">No messages sent yet</div></div> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(item => (
                <div key={item._id} style={{ padding: 13, border: '1px solid var(--navy-border)', borderRadius: 10 }}>
                  <div className="flex justify-between items-start gap-2">
                    <strong style={{ fontSize: 14 }}>{item.title}</strong>
                    <span className="badge badge-info">{item.channel}</span>
                  </div>
                  <div className="text-sm text-muted mt-1" style={{ whiteSpace: 'pre-wrap' }}>{item.message}</div>
                  <div className="text-xs text-muted mt-2">
                    {item.audience === 'user' ? 'Specific user' : item.audience === 'role' ? item.recipientRole : 'All customers & providers'}
                    {' · '}{item.recipientCount} recipient(s)
                    {item.channel !== 'in_app' ? ' · Email sent ' + item.emailSentCount + ', failed ' + item.emailFailedCount : ''}
                  </div>
                  <div className="text-xs text-muted mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
