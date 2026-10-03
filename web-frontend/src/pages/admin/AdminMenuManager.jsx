import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

function buildTree(menus, parentId = null) {
  return menus.filter(m => String(m.parentId || null) === String(parentId)).map(m => ({ ...m, children: buildTree(menus, m._id) }));
}

function MenuNode({ node, allMenus, onDelete, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <div className="tree-item" style={{ marginLeft: depth * 20 }}>
        <span style={{ fontSize: 18 }}>{node.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{node.name}</span>
          <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 10 }}>{node.type}</span>
          <span className="text-muted text-xs" style={{ marginLeft: 6 }}>L{node.level}</span>
        </div>
        {node.children.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(!expanded)} style={{ padding: '2px 8px', fontSize: 11 }}>
            {expanded ? '▼' : '▶'} {node.children.length}
          </button>
        )}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(node._id)} style={{ padding: '4px 10px' }}>🗑</button>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map(ch => <MenuNode key={ch._id} node={ch} allMenus={allMenus} onDelete={onDelete} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function AdminMenuManager() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', icon: '📁', parentId: '', type: 'product_category' });
  const [saving, setSaving] = useState(false);

  const load = () => adminAPI.getMenus().then(r => setMenus(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const addMenu = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAPI.addMenu({ ...form, parentId: form.parentId || null });
      toast.success('Menu item added');
      setForm(f => ({ ...f, name: '', parentId: '' }));
      load();
    } catch { toast.error('Failed to add'); } finally { setSaving(false); }
  };

  const deleteMenu = async (id) => {
    if (!confirm('Delete this menu item and all its children?')) return;
    try { await adminAPI.deleteMenu(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const tree = buildTree(menus);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Menu Manager</h1>
          <p className="page-subtitle">Add unlimited nested categories and service types</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        {/* Add Form */}
        <div className="card">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>➕ Add Menu Item</h2>
          <form onSubmit={addMenu} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Menu Name *</label>
              <input className="form-input" placeholder="e.g. Veg Food, Coaching, Electrician" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Icon (Emoji)</label>
              <input className="form-input" placeholder="📁" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="product_category">📦 Product Category</option>
                <option value="service_type">🛠️ Service Type</option>
                <option value="folder">📁 Folder</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Parent (optional)</label>
              <select className="form-select" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                <option value="">— Main Level —</option>
                {menus.map(m => (
                  <option key={m._id} value={m._id}>{'—'.repeat(m.level)} {m.icon} {m.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Adding...' : '➕ Add Menu Item'}
            </button>
          </form>
        </div>

        {/* Tree */}
        <div className="card">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>🌳 Current Menu Tree</h2>
          {loading ? <div className="loading-center"><div className="spinner" /></div> : (
            tree.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No menus yet</div></div> :
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {tree.map(node => <MenuNode key={node._id} node={node} allMenus={menus} onDelete={deleteMenu} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
