import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../api';

function timeAgo(value) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState('');

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await notificationsAPI.list({ limit: 20 });
      setItems(data.notifications || []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (error) {
      // Poll quietly. Authentication and network errors are handled elsewhere.
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(true);
    const interval = window.setInterval(() => refresh(false), 30000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const markAllRead = async () => {
    if (!unreadCount || actionId) return;
    setActionId('all');
    try {
      await notificationsAPI.markAllRead();
      const now = new Date().toISOString();
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch {
      await refresh(false);
    } finally {
      setActionId('');
    }
  };

  const openNotification = async (item) => {
    if (!item.readAt) {
      setActionId(item._id);
      try {
        await notificationsAPI.markRead(item._id);
        setItems(current => current.map(entry => entry._id === item._id
          ? { ...entry, readAt: new Date().toISOString() }
          : entry));
        setUnreadCount(count => Math.max(0, count - 1));
      } catch {
        await refresh(false);
      } finally {
        setActionId('');
      }
    }
    setOpen(false);
    if (item.link && item.link.startsWith('/')) navigate(item.link);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => { setOpen(value => !value); if (!open) refresh(false); }}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        style={{
          position: 'relative', width: 42, height: 42, borderRadius: 12,
          border: '1px solid var(--navy-border)', background: 'var(--navy-card)',
          color: 'var(--text-primary)', cursor: 'pointer', fontSize: 20,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 19, lineHeight: 1 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19,
            padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 99, background: '#ef4444', color: '#fff', fontSize: 10,
            fontWeight: 800, border: '2px solid var(--navy-card)',
          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <button aria-label="Close notifications" onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 70, background: 'transparent', border: 0, cursor: 'default'
          }} />
          <section role="dialog" aria-label="Notifications" style={{
            position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 'min(380px, calc(100vw - 24px))',
            maxHeight: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--navy-border)', borderRadius: 16,
            background: 'var(--navy-card)', boxShadow: '0 18px 48px rgba(0,0,0,.35)', zIndex: 71,
          }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Notifications</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{unreadCount} unread</div>
              </div>
              <button type="button" onClick={markAllRead} disabled={!unreadCount || actionId === 'all'} style={{
                border: 0, background: 'transparent', color: 'var(--saffron)', cursor: unreadCount ? 'pointer' : 'default',
                fontSize: 12, fontWeight: 700, opacity: unreadCount ? 1 : .5,
              }}>{actionId === 'all' ? 'Saving…' : 'Mark all read'}</button>
            </div>
            <div style={{ overflowY: 'auto' }}>
              {loading && items.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading notifications…</div>
              ) : items.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>You're all caught up</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Important updates will appear here.</div>
                </div>
              ) : items.map(item => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => openNotification(item)}
                  disabled={actionId === item._id}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', gap: 11, padding: 14,
                    border: 0, borderBottom: '1px solid var(--navy-border)',
                    background: item.readAt ? 'transparent' : 'rgba(245,158,11,.07)',
                    color: 'var(--text-primary)', cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'var(--navy)', fontSize: 16 }}>
                    {item.type === 'order' ? '🧾' : item.type === 'payment' ? '💳' : item.type === 'verification' ? '🛡️' : item.type === 'listing' ? '📦' : item.type === 'grievance' ? '📢' : '🔔'}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, lineHeight: 1.35, flex: 1 }}>{item.title}</strong>
                      {!item.readAt && <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: 50, background: 'var(--saffron)' }} />}
                    </span>
                    <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.45, marginTop: 4, overflowWrap: 'anywhere' }}>{item.message}</span>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              ))}
            </div>
            <div style={{ padding: '9px 14px', borderTop: '1px solid var(--navy-border)', fontSize: 11, color: 'var(--text-muted)' }}>
              Updates refresh automatically every 30 seconds.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
