import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../lib/api';


function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_COLORS = {
  payment_received: { bg: '#E8F5E9', border: '#4CAF50', icon: '💰' },
  new_order: { bg: '#E3F2FD', border: '#1976D2', icon: '📦' },
  order_placed: { bg: '#E3F2FD', border: '#1976D2', icon: '✅' },
  order_tracking: { bg: '#FFF3E0', border: '#F57C00', icon: '🚛' },
  delivery_confirmed: { bg: '#E8F5E9', border: '#388E3C', icon: '📬' },
  welcome: { bg: '#F3E5F5', border: '#7B1FA2', icon: '🌾' },
  default: { bg: '#F5F5F5', border: '#9E9E9E', icon: '🔔' }
};

export default function Notifications({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/notifications'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        // Token expired or invalid - log out
        localStorage.removeItem('nr_token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
    } catch (e) { /* silent fail */ }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch(apiUrl('/api/notifications/read-all'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(n => n.map(notif => ({ ...notif, read: true })));
      setUnread(0);
    } catch (e) { /* silent */ }
  };

  const markRead = async (id) => {
    if (!token) return;
    try {
      await fetch(apiUrl(`/api/notifications/${id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif));
      setUnread(u => Math.max(0, u - 1));
    } catch (e) { /* silent */ }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          position: 'relative', padding: '6px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        onMouseOut={e => e.currentTarget.style.background = 'none'}
      >
        <span style={{ fontSize: '1.3rem' }}>🔔</span>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '0', right: '0',
            background: '#F44336', color: '#fff', borderRadius: '50%',
            width: '18px', height: '18px', fontSize: '0.62rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', lineHeight: 1
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 'min(360px, 92vw)', background: '#fff', borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            zIndex: 1000, overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1565C0, #1E88E5)',
              padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>🔔 Notifications</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>
                  {unread > 0 ? `${unread} unread` : 'All caught up!'}
                </div>
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9E9E9E' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔕</div>
                  <div style={{ fontSize: '0.85rem' }}>No notifications yet</div>
                </div>
              ) : notifications.map(notif => {
                const style = TYPE_COLORS[notif.type] || TYPE_COLORS.default;
                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markRead(notif.id)}
                    style={{
                      padding: '12px 14px', cursor: 'pointer',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      borderBottom: '1px solid #F5F5F5',
                      background: notif.read ? '#fff' : style.bg,
                      borderLeft: notif.read ? 'none' : `3px solid ${style.border}`,
                      transition: 'background 0.15s'
                    }}
                  >
                    <span style={{ fontSize: '1.4rem', flexShrink: 0, lineHeight: 1 }}>
                      {notif.icon || style.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: notif.read ? 500 : 700, fontSize: '0.82rem',
                        color: '#212121', marginBottom: '3px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#616161', lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      {notif.amount && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: style.border, marginTop: '4px' }}>
                          ₹{notif.amount.toLocaleString('en-IN')}
                        </div>
                      )}
                      <div style={{ fontSize: '0.65rem', color: '#9E9E9E', marginTop: '4px' }}>
                        {timeAgo(notif.timestamp)}
                      </div>
                    </div>
                    {!notif.read && (
                      <div style={{ width: '8px', height: '8px', background: style.border, borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {notifications.length > 0 && (
              <div style={{ padding: '10px', background: '#FAFAFA', textAlign: 'center' }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#1565C0', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
