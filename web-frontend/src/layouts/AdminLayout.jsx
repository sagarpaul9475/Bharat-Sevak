import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';
import NotificationBell from '../components/NotificationBell';

const navItems = [
  { to: '/admin', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/admin/approvals', icon: '✅', label: 'Approvals' },
  { to: '/admin/menu-manager', icon: '📋', label: 'Menu Manager' },
  { to: '/admin/regions', icon: '📍', label: 'Regions' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/orders', icon: '🧾', label: 'Orders' },
  { to: '/admin/reports', icon: '📊', label: 'Reports' },
  { to: '/admin/grievances', icon: '📢', label: 'Grievances' },
  { to: '/admin/messages', icon: '✉️', label: 'Messages' },
  { to: '/admin/provider-queries', icon: '💬', label: 'Provider Queries' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); toast.success('Logged out'); };

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
            <div className="brand-sub">Admin Control</div>
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
          <div className="nav-section-title">Main Menu</div>
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

        <div style={{ padding: '16px', borderTop: '1px solid var(--navy-border)', marginTop: 'auto' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }} className="truncate">{user?.name}</div>
              <div className="text-sm text-muted">Administrator</div>
            </div>
          </div>
          <button className="btn btn-danger w-full justify-center" onClick={handleLogout}>
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
              Admin:{' '}
            </span>
            <span style={{ fontWeight: 600, fontSize: '14px' }} className="truncate">
              {user?.name}
            </span>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>
              👑 Admin
            </div>
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
