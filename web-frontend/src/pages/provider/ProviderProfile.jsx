import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI } from '../../api';
import toast from 'react-hot-toast';

export default function ProviderProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '', businessName: user?.businessName || '',
    businessDesc: user?.businessDesc || '', address: user?.address || '',
    providerType: user?.providerType || 'product', state: user?.region?.state || '',
    district: user?.region?.district || '', area: user?.region?.area || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await providerAPI.updateProfile({
        name: form.name, phone: form.phone, businessName: form.businessName, businessDesc: form.businessDesc, address: form.address, providerType: form.providerType,
        region: { state: form.state, district: form.district, area: form.area }
      });
      toast.success('Profile updated. Note: changes may require re-login to fully reflect.');
    } catch { toast.error('Failed to update profile'); } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Profile & KYC</h1>
          <p className="page-subtitle">Manage your business information and verification status</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Business Details</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group full">
              <label className="form-label">Owner Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group full">
              <label className="form-label">Business Name</label>
              <input className="form-input" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} required />
            </div>
            <div className="form-group full">
              <label className="form-label">Business Description</label>
              <textarea className="form-textarea" value={form.businessDesc} onChange={e => setForm({ ...form, businessDesc: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Provider Type</label>
              <select className="form-select" value={form.providerType} onChange={e => setForm({ ...form, providerType: e.target.value })}>
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="both">Both</option>
              </select>
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
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold mb-4">Verification Status (KYC)</h2>
          {user?.isVerified ? (
            <div className="p-4 rounded mb-4" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ fontSize: 24 }}>✅</div>
                <div><div className="font-bold text-emerald">Verified Provider</div><div className="text-sm text-emerald">Your account is fully active and visible to customers.</div></div>
              </div>
            </div>
          ) : (
             <div className="p-4 rounded mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ fontSize: 24 }}>⏳</div>
                <div><div className="font-bold text-pending">Pending Verification</div><div className="text-sm text-pending">Admin is reviewing your profile. You cannot sell yet.</div></div>
              </div>
            </div>
          )}
          <h3 className="font-bold mb-2">Upload KYC Documents</h3>
          <p className="text-sm text-muted mb-4">Upload your Aadhaar/PAN or Trade License for faster verification.</p>
          <div className="border border-dashed border-navy-border rounded p-6 text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="text-3xl mb-2">📄</div>
            <div className="font-bold mb-1">Click to upload</div>
            <div className="text-xs text-muted">JPG, PNG, PDF up to 5MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
