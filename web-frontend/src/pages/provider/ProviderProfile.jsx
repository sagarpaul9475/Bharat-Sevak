import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { providerAPI, uploadAPI } from '../../api';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const kycTypes = [
  { value: 'aadhaar', label: 'Aadhaar card' },
  { value: 'pan', label: 'PAN card' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving licence' },
  { value: 'other', label: 'Other government ID' },
];

const businessTypes = [
  { value: 'shop_photo', label: 'Shop / workplace photo' },
  { value: 'trade_license', label: 'Trade licence' },
  { value: 'gst_certificate', label: 'GST certificate' },
  { value: 'fssai', label: 'FSSAI certificate' },
  { value: 'rent_agreement', label: 'Rent agreement / ownership proof' },
  { value: 'other', label: 'Other business proof' },
];

function DocumentList({ docs, onDelete, deleting }) {
  if (!docs.length) {
    return <p className="text-sm text-muted">No documents uploaded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {docs.map((doc) => (
        <div key={doc._id || doc.filename} className="flex items-center justify-between gap-3 rounded border border-navy-border p-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{doc.originalName || doc.filename}</div>
            <div className="text-xs text-muted mt-1">
              {(doc.docType || 'document').replaceAll('_', ' ')} · {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Uploaded'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(doc)}
            disabled={deleting === doc.filename}
            aria-label={`Delete ${doc.originalName || doc.filename}`}
          >
            {deleting === doc.filename ? 'Deleting…' : 'Remove'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ProviderProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', phone: user?.phone || '', businessName: user?.businessName || '',
    businessDesc: user?.businessDesc || '', address: user?.address || '',
    providerType: user?.providerType || 'product', state: user?.region?.state || '',
    district: user?.region?.district || '', area: user?.region?.area || ''
  });
  const [saving, setSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(user?.isVerified));
  const [kycDocs, setKycDocs] = useState([]);
  const [businessDocs, setBusinessDocs] = useState([]);
  const [kycType, setKycType] = useState('aadhaar');
  const [businessType, setBusinessType] = useState('shop_photo');
  const [kycFile, setKycFile] = useState(null);
  const [businessFile, setBusinessFile] = useState(null);
  const [uploading, setUploading] = useState('');
  const [deleting, setDeleting] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const kycInput = useRef(null);
  const businessInput = useRef(null);

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const { data } = await uploadAPI.myDocs();
      setKycDocs(data.kycDocs || []);
      setBusinessDocs(data.businessDocs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load verification documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await providerAPI.updateProfile({
        name: form.name, phone: form.phone, businessName: form.businessName, businessDesc: form.businessDesc, address: form.address, providerType: form.providerType,
        region: { state: form.state, district: form.district, area: form.area }
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return 'Please choose a document first.';
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
    if (!ACCEPTED_TYPES.includes(file.type) && !allowedExtensions.includes(extension)) {
      return 'Choose a JPG, PNG, WEBP, or PDF file.';
    }
    if (file.size > MAX_FILE_SIZE) return 'The file must be 5 MB or smaller.';
    if (file.size === 0) return 'The selected file is empty.';
    return '';
  };

  const uploadDocument = async (category) => {
    const file = category === 'kyc' ? kycFile : businessFile;
    const validationMessage = validateFile(file);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', category === 'kyc' ? kycType : businessType);
    setUploading(category);
    try {
      const response = category === 'kyc'
        ? await uploadAPI.uploadKyc(formData)
        : await uploadAPI.uploadBusiness(formData);
      if (category === 'kyc') {
        setKycFile(null);
        if (kycInput.current) kycInput.current.value = '';
      } else {
        setBusinessFile(null);
        if (businessInput.current) businessInput.current.value = '';
      }
      setIsVerified(false);
      await loadDocs();
      toast.success(response.data?.message || 'Document uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading('');
    }
  };

  const deleteDocument = async (category, doc) => {
    if (!window.confirm(`Remove "${doc.originalName || doc.filename}" from your submission?`)) return;
    setDeleting(doc.filename);
    try {
      if (category === 'kyc') await uploadAPI.deleteKyc(encodeURIComponent(doc.filename));
      else await uploadAPI.deleteBusiness(encodeURIComponent(doc.filename));
      await loadDocs();
      toast.success('Document removed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove document');
    } finally {
      setDeleting('');
    }
  };

  const uploadCard = (category) => {
    const isKyc = category === 'kyc';
    const file = isKyc ? kycFile : businessFile;
    const setFile = isKyc ? setKycFile : setBusinessFile;
    const inputRef = isKyc ? kycInput : businessInput;
    const docType = isKyc ? kycType : businessType;
    const setDocType = isKyc ? setKycType : setBusinessType;
    const docs = isKyc ? kycDocs : businessDocs;
    const options = isKyc ? kycTypes : businessTypes;

    return (
      <section className="card">
        <div className="flex items-start gap-3 mb-3">
          <div style={{ fontSize: 28 }}>{isKyc ? '🪪' : '🏪'}</div>
          <div>
            <h3 className="text-lg font-bold">{isKyc ? 'Identity verification' : 'Business verification'}</h3>
            <p className="text-sm text-muted mt-1">
              {isKyc
                ? 'Upload Aadhaar or another government-issued ID for the admin team to review.'
                : 'Upload a shop/workplace photo, trade licence, GST/FSSAI certificate, rent agreement, or other business proof.'}
            </p>
          </div>
        </div>

        <div className="form-group mb-3">
          <label className="form-label">{isKyc ? 'Document type' : 'Business proof type'}</label>
          <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="form-group mb-3">
          <label className="form-label">Choose file</label>
          <input
            ref={inputRef}
            className="form-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-muted mt-2">JPG, PNG, WEBP or PDF · maximum 5 MB per file</p>
        </div>

        {file && (
          <div className="text-sm mb-3 p-3 rounded bg-navy border border-navy-border">
            <div className="font-medium break-all">{file.name}</div>
            <div className="text-muted mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB selected</div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary w-full justify-center mb-4"
          onClick={() => uploadDocument(category)}
          disabled={!file || uploading !== ''}
        >
          {uploading === category ? '⏳ Uploading…' : isKyc ? 'Upload identity document' : 'Upload business proof'}
        </button>

        <div className="border-t border-navy-border pt-4">
          <div className="font-bold mb-3">Submitted documents ({docs.length})</div>
          {loadingDocs ? <p className="text-sm text-muted">Loading documents…</p> : (
            <DocumentList docs={docs} onDelete={(doc) => deleteDocument(category, doc)} deleting={deleting} />
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Profile & KYC</h1>
          <p className="page-subtitle">Manage your business information and verification documents</p>
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
            <div className="form-group full">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-4">
          <section className="card">
            <h2 className="text-lg font-bold mb-3">Verification status</h2>
            <div className="p-4 rounded" style={{
              background: isVerified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${isVerified ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
            }}>
              <div className="font-bold">{isVerified ? '✅ Verified provider' : '⏳ Verification pending'}</div>
              <p className="text-sm mt-1">
                {user?.isVerified
                  ? 'Your provider account is marked as verified.'
                  : 'Upload your identity and business proof. The admin team must review your documents before verification.'}
              </p>
            </div>
            <p className="text-xs text-muted mt-3">Only upload documents you are comfortable sharing for verification. Aadhaar contains sensitive personal information; use a masked Aadhaar where accepted and do not upload documents for anyone else.</p>
          </section>
          {uploadCard('kyc')}
          {uploadCard('business')}
        </div>
      </div>
    </div>
  );
}
