import { useEffect, useState } from 'react';
import { providerAPI, customerAPI } from '../../api'; // We can use customerAPI.getMenus for the public menu list
import toast from 'react-hot-toast';

export default function ProviderProducts() {
  const [products, setProducts] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', minPrice: '', category: '', categoryName: '', stock: '', unit: 'piece', tags: '' });

  const load = () => {
    setLoading(true);
    Promise.all([providerAPI.getProducts(), customerAPI.getMenus()])
      .then(([p, m]) => { setProducts(p.data); setMenus(m.data.filter(x => x.type === 'product_category')); })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), minPrice: Number(form.minPrice || 0), stock: Number(form.stock || 0), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      if (editingId) { await providerAPI.updateProduct(editingId, payload); toast.success('Product updated (sent for approval)'); }
      else { await providerAPI.addProduct(payload); toast.success('Product added (sent for approval)'); }
      setShowModal(false); load();
    } catch { toast.error('Failed to save'); }
  };

  const handleEdit = (p) => {
    setEditingId(p._id);
    setForm({ name: p.name, description: p.description, price: p.price, minPrice: p.minPrice, category: p.category || '', categoryName: p.categoryName || '', stock: p.stock, unit: p.unit, tags: p.tags.join(', ') });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await providerAPI.deleteProduct(id); toast.success('Deleted'); load(); } catch { toast.error('Failed to delete'); }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', price: '', minPrice: '', category: '', categoryName: '', stock: '', unit: 'piece', tags: '' });
    setShowModal(true);
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 My Products</h1>
          <p className="page-subtitle">Manage your product inventory</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>➕ Add Product</button>
      </div>

      {loading ? <div className="loading-center"><div className="spinner" /></div> : (
        products.length === 0 ? <div className="empty-state"><div className="empty-icon">📦</div><div className="empty-title">No products yet</div><button className="btn btn-primary mt-4" onClick={openNew}>➕ Add your first product</button></div> :
        <div className="grid-4">
          {products.map(p => (
            <div key={p._id} className="product-card">
              <div className="product-img">{p.name[0].toUpperCase()}</div>
              <div className="product-body">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="product-name truncate" title={p.name}>{p.name}</h3>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
                <div className="text-xs text-muted mb-2 truncate">{p.categoryName || 'Uncategorized'}</div>
                <div className="product-price mb-3">₹{p.price} <span className="text-xs text-muted" style={{ fontWeight: 400 }}>/ {p.unit}</span></div>
                
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
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && setShowModal(false)}>
          <div className="modal-box">
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
              <div className="form-group full mt-2">
                <button type="submit" className="btn btn-primary w-full" style={{ padding: 12, justifyContent: 'center' }}>
                  {editingId ? '💾 Save Changes' : '➕ Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
