import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultRole = params.get('role') || 'customer';

  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    businessName: '',
    providerType: 'product',
    deliveryVehicleType: 'bike',
    serviceSpecialization: 'Delivery Partner',
    state: '',
    district: '',
    area: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        region: { state: form.state, district: form.district, area: form.area },
      };
      if (role === 'provider') {
        payload.businessName = form.businessName;
        payload.providerType = form.providerType;
      } else if (role === 'delivery') {
        payload.deliveryVehicleType = form.deliveryVehicleType;
        payload.serviceSpecialization = form.serviceSpecialization;
      }

      const user = await register(payload);
      if (role === 'provider') {
        toast.success('Registration submitted! Awaiting admin approval.');
        navigate('/login');
      } else if (role === 'delivery') {
        toast.success(`Welcome to the Delivery & Service fleet, ${user.name}!`);
        navigate('/delivery');
      } else {
        toast.success(`Welcome, ${user.name}!`);
        navigate('/browse');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0F172A,#1E293B)', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 540 }} className="animate-slide-up">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#FF6B00,#CC5500)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 12px' }}>🇮🇳</div>
          <h1 style={{ fontSize: 26 }}>Join Bharat Sevak</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Empowering customers, shops, delivery partners & service professionals
          </p>
        </div>

        <div className="card">
          {/* Role Toggle */}
          <div style={{ marginBottom: 20 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>I want to register as:</div>
            <div className="tabs" style={{ width: '100%', gap: 4 }}>
              <button
                type="button"
                className={`tab-btn ${role === 'customer' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}
                onClick={() => setRole('customer')}
              >
                🛒 Customer
              </button>
              <button
                type="button"
                className={`tab-btn ${role === 'provider' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}
                onClick={() => setRole('provider')}
              >
                🏪 Provider / Shop
              </button>
              <button
                type="button"
                className={`tab-btn ${role === 'delivery' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}
                onClick={() => setRole('delivery')}
              >
                🛵 Delivery / Tech
              </button>
            </div>

            {role === 'provider' && (
              <div style={{ marginTop: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#F59E0B' }}>
                ⚠️ Provider accounts need admin verification before you can start selling
              </div>
            )}
            {role === 'delivery' && (
              <div style={{ marginTop: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#38BDF8' }}>
                🛵 Fulfill product deliveries or on-site service jobs (Electrician, Plumber, etc.) with Live GPS tracking and OTP verification!
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" placeholder="10-digit mobile" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="form-group full">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group full">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>

              {role === 'provider' && (
                <>
                  <div className="form-group full">
                    <label className="form-label">Business Name *</label>
                    <input className="form-input" placeholder="Your shop / business name" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} required />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Provider Type *</label>
                    <select className="form-select" value={form.providerType} onChange={e => setForm(f => ({ ...f, providerType: e.target.value }))}>
                      <option value="product">📦 Product Seller</option>
                      <option value="service">🛠️ Service Provider</option>
                      <option value="both">📦🛠️ Both</option>
                    </select>
                  </div>
                </>
              )}

              {role === 'delivery' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Specialization / Job Type *</label>
                    <select
                      className="form-select"
                      value={form.serviceSpecialization}
                      onChange={e => setForm(f => ({ ...f, serviceSpecialization: e.target.value }))}
                    >
                      <option value="Delivery Partner">🛵 Delivery Partner (Orders)</option>
                      <option value="Electrician">🔧 Electrician (Services)</option>
                      <option value="Plumber">🚰 Plumber (Services)</option>
                      <option value="Sweeper / Cleaner">🧹 Sweeper / Cleaner</option>
                      <option value="Home Tutor">📚 Home Tutor</option>
                      <option value="General Technician">🛠️ General Field Technician</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vehicle Type *</label>
                    <select
                      className="form-select"
                      value={form.deliveryVehicleType}
                      onChange={e => setForm(f => ({ ...f, deliveryVehicleType: e.target.value }))}
                    >
                      <option value="bike">🏍️ Motorcycle / Bike</option>
                      <option value="scooter">🛵 Scooter</option>
                      <option value="bicycle">🚲 Bicycle</option>
                      <option value="van">🚐 Van / Auto</option>
                      <option value="on_foot">🚶 On Foot</option>
                      <option value="other">🚗 Other</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" placeholder="e.g. West Bengal" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">District</label>
                <input className="form-input" placeholder="e.g. Nadia" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="form-label">Area / Locality</label>
                <input className="form-input" placeholder="e.g. Bethuadahari" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ padding: '13px', fontSize: 15, marginTop: 16 }} disabled={loading}>
              {loading ? '⏳ Creating account...' : `✅ Register as ${role === 'customer' ? 'Customer' : role === 'provider' ? 'Provider' : 'Delivery & Tech Partner'}`}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--saffron)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
