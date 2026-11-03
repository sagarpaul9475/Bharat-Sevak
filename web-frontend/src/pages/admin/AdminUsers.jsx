import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  active:    { label: 'Active',    color: 'var(--emerald)' },
  approved:  { label: 'Approved',  color: 'var(--emerald)' },
  pending:   { label: 'Pending',   color: 'var(--saffron)' },
  rejected:  { label: 'Rejected',  color: '#EF4444' },
  banned:    { label: 'Banned',    color: '#EF4444' },
  suspended: { label: 'Suspended', color: '#F97316' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ role: '', status: '' });
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers(filter);
      setUsers(res.data.users); setTotal(res.data.total);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateUser(id, { status });
      const label = STATUS_LABELS[status]?.label || status;
      toast.success(`User status set to "${label}". ${['rejected','banned','suspended'].includes(status) ? 'Their listings have been hidden from the marketplace.' : 'Their approved listings have been restored.'}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Delete "${name}"? This will also hide all their listings from the marketplace.`)) return;
    try { await adminAPI.deleteUser(id); toast.success('User deleted and listings suspended'); load(); } catch { toast.error('Failed to delete user'); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Users ({total})</h1>
          <p className="page-subtitle">Manage all platform users · Banning/suspending a provider hides all their listings</p>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 160 }} value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
            <option value="delivery">Delivery</option>
            <option value="admin">Admin</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="banned">Banned</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          users.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No users found</div></div> :
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Region</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => {
                  const isBanned = ['rejected', 'banned', 'suspended'].includes(u.status);
                  const statusInfo = STATUS_LABELS[u.status] || { label: u.status, color: '#94A3B8' };
                  return (
                    <tr key={u._id} style={{ opacity: isBanned ? 0.7 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{u.name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                            <div className="text-xs text-muted">{u.email}</div>
                            {u.businessName && <div className="text-xs" style={{ color: 'var(--saffron)' }}>🏪 {u.businessName}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge badge-${u.role === 'admin' ? 'info' : u.role === 'provider' ? 'pending' : 'approved'}`}>{u.role}</span></td>
                      <td>{u.phone}</td>
                      <td className="text-sm text-muted">{[u.region?.area, u.region?.district, u.region?.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12,
                          fontWeight: 700, background: `${statusInfo.color}22`, color: statusInfo.color,
                          border: `1px solid ${statusInfo.color}44`
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                          {/* Approve */}
                          {(u.status === 'pending' || isBanned) && u.role !== 'admin' && (
                            <button
                              className="btn btn-success btn-sm"
                              title="Approve / Re-activate (restores their listings)"
                              onClick={() => updateStatus(u._id, u.role === 'provider' ? 'approved' : 'active')}
                            >✅ Approve</button>
                          )}

                          {/* Ban (sets status to banned, hides all listings) */}
                          {u.status !== 'banned' && u.role !== 'admin' && (
                            <button
                              className="btn btn-danger btn-sm"
                              title="Ban user (hides all their listings)"
                              onClick={() => updateStatus(u._id, 'banned')}
                            >🚫 Ban</button>
                          )}

                          {/* Suspend (temporary, hides listings) */}
                          {u.status !== 'suspended' && u.role === 'provider' && (
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316', border: '1px solid #F97316', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                              title="Temporarily suspend (hides their listings)"
                              onClick={() => updateStatus(u._id, 'suspended')}
                            >⏸ Suspend</button>
                          )}

                          {/* Delete */}
                          {u.role !== 'admin' && (
                            <button
                              className="btn btn-danger btn-sm"
                              title="Permanently delete (suspends all listings)"
                              onClick={() => deleteUser(u._id, u.name)}
                            >🗑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
