import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerAPI } from '../../api';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '', address: user?.address || '',
    state: user?.region?.state || '', district: user?.region?.district || '', area: user?.region?.area || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customerAPI.updateProfile({
        name: form.name, phone: form.phone, address: form.address,
        region: { state: form.state, district: form.district, area: form.area }
      });
      toast.success('Profile updated. Note: changes may require re-login to fully reflect.');
    } catch { toast.error('Failed to update profile'); } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ width: '100%' }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, margin: '0 auto 16px' }}>{user?.name?.[0]?.toUpperCase()}</div>
          <h1 className="page-title" style={{ justifyContent: 'center' }}>My Profile</h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group full">
            <label className="form-label">Email (Read Only)</label>
            <input className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="form-group full">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="form-group full">
            <label className="form-label">Delivery Address</label>
            <textarea className="form-textarea" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">District</label>
            <input className="form-input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
          </div>
          <div className="form-group full">
            <label className="form-label">Area / Locality</label>
            <input className="form-input" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} />
          </div>
          <div className="form-group full mt-4">
            <button type="submit" className="btn btn-primary w-full justify-center py-3" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
