import { useEffect, useState } from 'react';
import { deliveryAPI } from '../api';
import toast from 'react-hot-toast';

export default function AssignWorkerModal({ order, onClose, onAssigned }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [mode, setMode] = useState('registered'); // 'registered' | 'custom'
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [assignedRole, setAssignedRole] = useState(order?.orderType === 'service' ? 'technician' : 'delivery_man');

  useEffect(() => {
    deliveryAPI.getWorkers()
      .then(res => {
        setWorkers(res.data);
        if (res.data.length > 0) {
          setSelectedWorkerId(res.data[0]._id);
        }
      })
      .catch(() => toast.error('Failed to load available workers'))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let payload = { assignedRole };
      if (mode === 'registered') {
        const worker = workers.find(w => w._id === selectedWorkerId);
        if (!worker) {
          toast.error('Please select a worker');
          return;
        }
        payload.assignedTo = worker._id;
        payload.assignedName = worker.name;
        payload.assignedPhone = worker.phone;
      } else {
        if (!customName.trim()) {
          toast.error('Please enter partner name');
          return;
        }
        payload.assignedName = customName.trim();
        payload.assignedPhone = customPhone.trim();
      }

      const res = await deliveryAPI.assignWorker(order._id, payload);
      toast.success(res.data.message || 'Worker successfully assigned!');
      if (onAssigned) onAssigned(res.data.order);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign worker');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-box" style={{ maxWidth: 540 }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{order?.orderType === 'service' ? '🔧' : '🛵'}</span>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>Assign {order?.orderType === 'service' ? 'Field Technician' : 'Delivery Partner'}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order #{order?.orderId}</div>
            </div>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}>✕</button>
        </div>

        {/* Toggle Mode */}
        <div className="tabs mb-4">
          <button
            type="button"
            className={`tab-btn ${mode === 'registered' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('registered')}
          >
            🛵 Platform Partner
          </button>
          <button
            type="button"
            className={`tab-btn ${mode === 'custom' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('custom')}
          >
            🧑‍💼 Self / In-House Staff
          </button>
        </div>

        <form onSubmit={handleAssign}>
          <div className="form-group mb-3">
            <label className="form-label">Role Type</label>
            <select
              className="form-select"
              value={assignedRole}
              onChange={(e) => setAssignedRole(e.target.value)}
            >
              <option value="delivery_man">🛵 Delivery Partner (Product delivery)</option>
              <option value="technician">🔧 Field Technician (Electrician, Plumber, etc.)</option>
              <option value="provider">🏪 Shop Owner / Self-Fulfillment</option>
            </select>
          </div>

          {mode === 'registered' ? (
            <div className="form-group mb-4">
              <label className="form-label">Select Available Partner</label>
              {loading ? (
                <div className="spinner" style={{ margin: '10px auto' }} />
              ) : workers.length === 0 ? (
                <div style={{ background: '#0F172A', padding: 12, borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  No registered delivery partners currently online. You can select "Self / In-House Staff" above to enter contact details.
                </div>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {workers.map(w => (
                    <label
                      key={w._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: selectedWorkerId === w._id ? 'rgba(245,158,11,0.12)' : '#0F172A',
                        border: selectedWorkerId === w._id ? '2px solid #F59E0B' : '1px solid #334155',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="radio"
                          name="worker"
                          checked={selectedWorkerId === w._id}
                          onChange={() => setSelectedWorkerId(w._id)}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{w.name} {w.businessName ? `(${w.businessName})` : ''}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {w.serviceSpecialization || 'Delivery Partner'} • {w.deliveryVehicleType || 'Vehicle'} • 📞 {w.phone}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-confirmed" style={{ fontSize: 10 }}>Available</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="form-group mb-3">
                <label className="form-label">Partner / Staff Full Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Partner Contact Phone *</label>
                <input
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '⏳ Assigning...' : '✅ Assign & Dispatch Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
