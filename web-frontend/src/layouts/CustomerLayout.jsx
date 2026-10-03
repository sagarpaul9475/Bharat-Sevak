import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); toast.success('Logged out'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header style={{
        height: 'var(--topbar-height)', background: 'rgba(15,23,42,0.97)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--navy-border)',
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, var(--saffron), var(--saffron-dark))',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>🇮🇳</div>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 18 }}>Bharat Sevak</span>
        </Link>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 24 }}>
          <Link to="/browse" className="btn btn-secondary btn-sm">🛍️ Browse</Link>
          {user && <Link to="/orders" className="btn btn-secondary btn-sm">🧾 My Orders</Link>}
          {user && <Link to="/grievance" className="btn btn-secondary btn-sm">📢 Grievance</Link>}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
                <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</span>
              </Link>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </header>
      <main style={{ flex: 1, padding: '24px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
