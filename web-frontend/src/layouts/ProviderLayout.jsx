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
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">🇮🇳</div>
          <div>
            <div className="brand-name">Bharat Sevak</div>
            <div className="brand-sub">Provider Panel</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-title">Provider Menu</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--navy-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'P'}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, maxWidth: 160 }} className="truncate">{user?.businessName || user?.name}</div>
              <div className="text-sm text-muted">Provider</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm w-full" onClick={handleSwitchRole}>🛒 Switch to Customer</button>
          <button className="btn btn-danger btn-sm w-full" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>
      <div className="main-content">
        <header className="topbar">
          <div className="flex-1">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Provider: </span>
            <span style={{ fontWeight: 600 }}>{user?.businessName || user?.name}</span>
          </div>
          {user?.isVerified ? <div className="badge badge-approved">✅ Verified</div> : <div className="badge badge-pending">⏳ Pending Verification</div>}
          <NotificationBell />
        </header>
        <div className="page-content animate-fade"><Outlet /></div>
      </div>
      {mobileOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
