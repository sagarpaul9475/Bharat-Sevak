import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { to: '/provider', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/provider/products', icon: '📦', label: 'My Products' },
  { to: '/provider/services', icon: '🛠️', label: 'My Services' },
  { to: '/provider/orders', icon: '🧾', label: 'Orders' },
  { to: '/delivery', icon: '🛵', label: 'Delivery & Live GPS' },
  { to: '/provider/co-providers', icon: '🤝', label: 'Co-Providers' },
  { to: '/provider/profile', icon: '👤', label: 'Profile / KYC' },
  { to: '/provider/queries', icon: '💬', label: 'Admin Support' },
];

export default function ProviderLayout() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); toast.success('Logged out'); };
  const handleSwitchRole = async () => {
    try {
      const updated = await switchRole();
      if (updated.activeRole === 'customer') {
        navigate('/browse');
        toast.success('Switched to Customer mode');
      }
    } catch { toast.error('Could not switch role'); }
  };

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">🇮🇳</div>
          <div style={{ flex: 1 }}>
            <div className="brand-name">Bharat Sevak</div>
            <div className="brand-sub">Provider Panel</div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Provider Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--navy-border)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'P'}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }} className="truncate">
                {user?.businessName || user?.name}
              </div>
              <div className="text-sm text-muted">Provider</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm w-full justify-center" onClick={handleSwitchRole}>
            🛒 Switch to Customer
          </button>
          <button className="btn btn-danger btn-sm w-full justify-center" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="btn-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open navigation menu"
          >
            ☰
          </button>

          <div className="topbar-title-wrap" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }} className="hide-on-mobile">
              Provider:{' '}
            </span>
            <span style={{ fontWeight: 600, fontSize: '14px' }} className="truncate">
              {user?.businessName || user?.name}
            </span>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.isVerified ? (
              <span className="badge badge-approved" style={{ whiteSpace: 'nowrap' }}>
                ✅ Verified
              </span>
            ) : (
              <span className="badge badge-pending" style={{ whiteSpace: 'nowrap' }}>
                ⏳ Pending
              </span>
            )}
            <NotificationBell />
          </div>
        </header>

        <div className="page-content animate-fade">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
