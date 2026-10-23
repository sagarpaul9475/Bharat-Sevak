import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showScrollCue, setShowScrollCue] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
    toast.success('Logged out');
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/browse') {
      setShowScrollCue(false);
      return undefined;
    }

    const checkScrollable = () => {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 120;
      setShowScrollCue(scrollable && window.scrollY < 100);
    };

    checkScrollable();
    window.addEventListener('scroll', checkScrollable, { passive: true });
    window.addEventListener('resize', checkScrollable);
    return () => {
      window.removeEventListener('scroll', checkScrollable);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [location.pathname]);

  const scrollDown = () => {
    window.scrollTo({
      top: Math.min(window.scrollY + window.innerHeight * 0.7, document.documentElement.scrollHeight),
      behavior: 'smooth'
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header className="customer-header">
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, background: 'linear-gradient(135deg, var(--saffron), var(--saffron-dark))',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            boxShadow: '0 2px 10px rgba(255,107,0,0.3)'
          }}>
            🇮🇳
          </div>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: 18, color: '#F8FAFC' }}>
            Bharat Sevak
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="customer-nav hide-on-mobile">
          <Link to="/browse" className="btn btn-secondary btn-sm">🛍️ Browse</Link>
          {user && <Link to="/orders" className="btn btn-secondary btn-sm">🧾 My Orders</Link>}
          {user && <Link to="/grievance" className="btn btn-secondary btn-sm">📢 Grievance</Link>}
          {user && (user.role === 'delivery' || user.role === 'provider') && (
            <Link to="/delivery" className="btn btn-primary btn-sm">🛵 Delivery Console</Link>
          )}
        </nav>

        {/* Right Section */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {user ? (
            <>
              <NotificationBell />
              
              {/* Desktop User Profile Link */}
              <Link to="/profile" className="flex items-center gap-2 hide-on-mobile" style={{ textDecoration: 'none' }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, maxWidth: 120 }} className="truncate">
                  {user.name}
                </span>
              </Link>

              <button className="btn btn-danger btn-sm hide-on-mobile" onClick={handleLogout}>
                Logout
              </button>

              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                className="btn-mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </>
          ) : (
            <>
              <div className="hide-on-mobile" style={{ display: 'flex', gap: 8 }}>
                <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </div>

              {/* Mobile Hamburger Toggle for Guests */}
              <button
                type="button"
                className="btn-mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-nav-drawer animate-slide-up">
            {user && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'rgba(15,23,42,0.6)',
                borderRadius: 10,
                marginBottom: 12,
                border: '1px solid var(--navy-border)'
              }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }} className="truncate">{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="truncate">{user.email}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/browse" className="btn btn-secondary w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                🛍️ Browse Products & Services
              </Link>
              
              {user ? (
                <>
                  <Link to="/orders" className="btn btn-secondary w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                    🧾 My Orders & Live Tracking
                  </Link>
                  <Link to="/grievance" className="btn btn-secondary w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                    📢 Grievance / Complaints
                  </Link>

                  {(user.role === 'delivery' || user.role === 'provider') && (
                    <Link to="/delivery" className="btn btn-primary w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                      🛵 Delivery & Service Console
                    </Link>
                  )}

                  {user.role === 'provider' && (
                    <Link to="/provider" className="btn btn-secondary w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                      🏪 Provider Dashboard
                    </Link>
                  )}

                  <Link to="/profile" className="btn btn-secondary w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                    👤 My Profile
                  </Link>

                  <div style={{ borderTop: '1px solid var(--navy-border)', paddingTop: 10, marginTop: 4 }}>
                    <button className="btn btn-danger w-full justify-center" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                    🔑 Sign In
                  </Link>
                  <Link to="/register" className="btn btn-primary w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                    ✨ Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {showScrollCue && (
        <button type="button" className="customer-scroll-cue" onClick={scrollDown} aria-label="Scroll down for more">
          <span>↓</span>
        </button>
      )}

      <main style={{ flex: 1, padding: '20px 16px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
