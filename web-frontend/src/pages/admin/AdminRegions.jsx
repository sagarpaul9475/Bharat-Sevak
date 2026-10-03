import { useEffect, useState } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

function buildRegionTree(regions, parentId = null) {
  return regions.filter(r => String(r.parent || null) === String(parentId)).map(r => ({ ...r, children: buildRegionTree(regions, r._id) }));
}

function RegionNode({ node, onDelete, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const typeColor = { state: '#FF6B00', district: '#3B82F6', area: '#10B981' };
  return (
    <div>
      <div className="tree-item" style={{ marginLeft: depth * 20 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor[node.type] || '#64748B', display: 'inline-block', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{node.name}</span>
          <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${typeColor[node.type]}20`, color: typeColor[node.type] }}>{node.type}</span>
        </div>
        {node.children.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(!expanded)} style={{ padding: '2px 8px', fontSize: 11 }}>{expanded ? '▼' : '▶'} {node.children.length}</button>}
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(node._id)}>🗑</button>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map(ch => <RegionNode key={ch._id} node={ch} onDelete={onDelete} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function AdminRegions() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'state', parentId: '' });

  const load = () => adminAPI.getRegions().then(r => setRegions(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const addRegion = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.addRegion({ name: form.name, type: form.type, parent: form.parentId || null });
      toast.success('Region added');
      setForm(f => ({ ...f, name: '', parentId: '' }));
      load();
    } catch { toast.error('Failed'); }
  };

  const deleteRegion = async (id) => {
    if (!confirm('Delete this region?')) return;
    try { await adminAPI.deleteRegion(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const tree = buildRegionTree(regions);
  const parentOptions = form.type === 'district' ? regions.filter(r => r.type === 'state') : form.type === 'area' ? regions.filter(r => r.type === 'district') : [];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">🗺️ Region Manager</h1>
          <p className="page-subtitle">Manage State → District → Area hierarchy</p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
        <div className="card">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>➕ Add Region</h2>
          <form onSubmit={addRegion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Region Name *</label>
              <input className="form-input" placeholder="e.g. West Bengal, Nadia, Bethuadahari" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, parentId: '' }))}>
                <option value="state">State</option>
                <option value="district">District</option>
                <option value="area">Area / Locality</option>
              </select>
            </div>
            {parentOptions.length > 0 && (
              <div className="form-group">
                <label className="form-label">Parent {form.type === 'district' ? 'State' : 'District'}</label>
                <select className="form-select" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                  <option value="">— Select —</option>
                  {parentOptions.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-primary">➕ Add Region</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>🌳 Region Tree</h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12 }}>
            {[['state','#FF6B00'],['district','#3B82F6'],['area','#10B981']].map(([t,c]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{t}</span>
              </div>
            ))}
          </div>
          {loading ? <div className="loading-center"><div className="spinner" /></div> :
            tree.length === 0 ? <div className="empty-state"><div className="empty-icon">🗺️</div><div className="empty-title">No regions yet</div><div className="empty-text">Add states, districts, and areas above</div></div> :
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {tree.map(node => <RegionNode key={node._id} node={node} onDelete={deleteRegion} />)}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
