import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/admin/approvals', icon: '✅', label: 'Approvals' },
  { to: '/admin/menu-manager', icon: '📋', label: 'Menu Manager' },
  { to: '/admin/regions', icon: '🗺️', label: 'Regions' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/orders', icon: '🧾', label: 'All Orders' },
  { to: '/admin/grievances', icon: '📢', label: 'Grievances' },
  { to: '/admin/reports', icon: '📊', label: 'Reports' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); toast.success('Logged out'); };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">🇮🇳</div>
          <div>
            <div className="brand-name">Bharat Sevak</div>
            <div className="brand-sub">Admin Control</div>
          </div>
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
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--navy-border)', marginTop: 'auto' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name}</div>
              <div className="text-sm text-muted">Administrator</div>
            </div>
          </div>
          <button className="btn btn-danger w-full" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <button className="btn btn-secondary btn-sm" style={{ display: 'none' }} onClick={() => setMobileOpen(!mobileOpen)} id="hamb">☰</button>
          <div className="flex-1">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Welcome back, </span>
            <span style={{ fontWeight: 600 }}>{user?.name}</span>
          </div>
          <div className="badge badge-info">👑 Admin</div>
        </header>
        <div className="page-content animate-fade">
          <Outlet />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
