import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

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
    try { await adminAPI.updateUser(id, { status }); toast.success('Updated'); load(); } catch { toast.error('Failed'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await adminAPI.deleteUser(id); toast.success('User deleted'); load(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Users ({total})</h1>
          <p className="page-subtitle">Manage all platform users</p>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 160 }} value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}>
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          users.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No users found</div></div> :
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Region</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{u.name?.[0]?.toUpperCase()}</div>
                        <div><div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div><div className="text-xs text-muted">{u.email}</div></div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${u.role === 'admin' ? 'info' : u.role === 'provider' ? 'pending' : 'approved'}`}>{u.role}</span></td>
                    <td>{u.phone}</td>
                    <td className="text-sm text-muted">{[u.region?.area, u.region?.district, u.region?.state].filter(Boolean).join(', ') || '—'}</td>
                    <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                    <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        {u.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(u._id, 'approved')}>✅</button>}
                        {u.status !== 'rejected' && u.role !== 'admin' && <button className="btn btn-danger btn-sm" onClick={() => updateStatus(u._id, 'rejected')}>🚫</button>}
                        {u.role !== 'admin' && <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u._id)}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
