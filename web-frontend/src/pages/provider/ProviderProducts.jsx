import { useEffect, useMemo, useState } from 'react';
import { providerAPI, customerAPI, uploadAPI } from '../../api';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '', description: '', price: '', minPrice: '', category: '',
  categoryName: '', stock: '', unit: 'piece', tags: '',
};

export default function ProviderProducts() {
  const [products, setProducts] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [existingVideo, setExistingVideo] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);

  const imagePreviews = useMemo(() => imageFiles.map(file => ({
    file,
    url: URL.createObjectURL(file),
  })), [imageFiles]);

  const videoPreview = useMemo(() => videoFile ? URL.createObjectURL(videoFile) : '', [videoFile]);

  useEffect(() => () => imagePreviews.forEach(item => URL.revokeObjectURL(item.url)), [imagePreviews]);
  useEffect(() => () => { if (videoPreview) URL.revokeObjectURL(videoPreview); }, [videoPreview]);

  const load = () => {
    setLoading(true);
    Promise.all([providerAPI.getProducts(), customerAPI.getMenus()])
      .then(([p, m]) => {
        setProducts(p.data);
        setMenus(m.data.filter(x => x.type === 'product_category'));
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetMedia = () => {
    setExistingImages([]);
    setExistingVideo('');
    setImageFiles([]);
    setVideoFile(null);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    resetMedia();
    setShowModal(true);
  };

  const handleEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price ?? '',
      minPrice: p.minPrice ?? '',
      category: p.category || '',
      categoryName: p.categoryName || '',
      stock: p.stock ?? '',
      unit: p.unit || 'piece',
      tags: (p.tags || []).join(', '),
    });
    setExistingImages(p.images || []);
    setExistingVideo(p.videoUrl || '');
    setImageFiles([]);
    setVideoFile(null);
    setShowModal(true);
  };

  const handleImageChange = (event) => {
    const selected = Array.from(event.target.files || []);
    if (existingImages.length + selected.length > 5) {
      toast.error('Maximum 5 product images are allowed');
      event.target.value = '';
      return;
    }
    setImageFiles(selected);
  };

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Product video must be 20MB or smaller');
      event.target.value = '';
      return;
    }
    setVideoFile(file);
  };

  const uploadMedia = async () => {
    if (imageFiles.length === 0 && !videoFile) {
      return { images: existingImages, videoUrl: existingVideo };
    }
    const data = new FormData();
    imageFiles.forEach(file => data.append('images', file));
    if (videoFile) data.append('video', videoFile);

    const { data: uploaded } = await uploadAPI.uploadProductMedia(data);
    return {
      images: [...existingImages, ...(uploaded.images || [])].slice(0, 5),
      videoUrl: uploaded.videoUrl || existingVideo,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (existingImages.length + imageFiles.length > 5) {
      toast.error('Maximum 5 product images are allowed');
      return;
    }

    setSaving(true);
    try {
      const media = await uploadMedia();
      const payload = {
        ...form,
        price: Number(form.price),
        minPrice: Number(form.minPrice || 0),
        stock: Number(form.stock || 0),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: media.images,
        videoUrl: media.videoUrl,
      };

      if (editingId) {
        await providerAPI.updateProduct(editingId, payload);
        toast.success('Product updated and sent for approval');
      } else {
        await providerAPI.addProduct(payload);
        toast.success('Product added and sent for approval');
      }

      setShowModal(false);
      resetMedia();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await providerAPI.deleteProduct(id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 My Products</h1>
          <p className="page-subtitle">Manage your product inventory and media</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>➕ Add Product</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No products yet</div>
            <button className="btn btn-primary mt-4" onClick={openNew}>➕ Add your first product</button>
          </div>
        ) : (
          <div className="grid-4">
            {products.map(p => (
              <div key={p._id} className="product-card">
                {p.images?.[0] ? (
                  <img className="product-img" src={p.images[0]} alt={p.name} />
                ) : (
                  <div className="product-img">{p.name?.[0]?.toUpperCase() || '📦'}</div>
                )}
                <div className="product-body">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="product-name truncate" title={p.name}>{p.name}</h3>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </div>
                  <div className="text-xs text-muted mb-2 truncate">{p.categoryName || 'Uncategorized'}</div>
                  <div className="product-price mb-2">₹{p.price} <span className="text-xs text-muted" style={{ fontWeight: 400 }}>/ {p.unit}</span></div>
                  <div className="flex gap-2 mb-3">
                    {p.images?.length > 0 && <span className="badge badge-info">📷 {p.images.length}</span>}
                    {p.videoUrl && <span className="badge badge-info">🎬 Video</span>}
                  </div>
                  {p.status === 'rejected' && p.rejectionReason && (
                    <div style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: 4, marginBottom: 8 }}>
                      <strong>Reason:</strong> {p.rejectionReason}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" style={{ padding: '6px 10px' }} onClick={() => handleDelete(p._id)}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setShowModal(false)}>
          <div className="modal-box wide">
            <div className="modal-head">
              <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
              <button className="btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group full">
                <label className="form-label">Product Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group full">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input className="form-input" type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <input className="form-input" placeholder="e.g. piece, kg, liter" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
              </div>
              <div className="form-group full">
                <label className="form-label">Category *</label>
                <select className="form-select" value={form.category} onChange={e => {
                  const sel = e.target.options[e.target.selectedIndex];
                  setForm({ ...form, category: e.target.value, categoryName: sel.text });
                }} required>
                  <option value="">— Select Category —</option>
                  {menus.map(m => <option key={m._id} value={m._id}>{'—'.repeat(m.level)} {m.icon} {m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input className="form-input" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input className="form-input" placeholder="e.g. fresh, organic" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>

              <div className="form-group full">
                <label className="form-label">Product Photos · up to 5 (JPG, PNG, WEBP · 5MB each)</label>
                <input className="form-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} />
                <div className="media-preview-grid">
                  {existingImages.map((url, index) => (
                    <div className="media-preview" key={url}>
                      <img src={url} alt={`Product ${index + 1}`} />
                      <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}>✕</button>
                    </div>
                  ))}
                  {imagePreviews.map(item => (
                    <div className="media-preview" key={item.url}>
                      <img src={item.url} alt={item.file.name} />
                      <button type="button" onClick={() => setImageFiles(prev => prev.filter(file => file !== item.file))}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted mt-1">{existingImages.length + imageFiles.length}/5 photos selected</div>
              </div>

              <div className="form-group full">
                <label className="form-label">Short Product Video · optional (MP4, WEBM, MOV · 20MB max)</label>
                <input className="form-input" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} />
                {(existingVideo || videoPreview) && (
                  <div className="video-preview-wrap">
                    <video src={videoPreview || existingVideo} controls muted playsInline />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => { setExistingVideo(''); setVideoFile(null); }}>Remove video</button>
                  </div>
                )}
              </div>

              <div className="form-group full mt-2">
                <button type="submit" className="btn btn-primary w-full" style={{ padding: 12, justifyContent: 'center' }} disabled={saving}>
                  {saving ? '⏳ Uploading & saving...' : editingId ? '💾 Save Changes' : '➕ Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
