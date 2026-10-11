import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { apiRequest } from '../services/api';
import { wsService } from '../services/websocket';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/notifications/');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time incoming notifications
    const unsubNotif = wsService.on('NOTIFICATION', (data) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    const unsubAlert = wsService.on('STAFF_ALERT', (data) => {
      setNotifications((prev) => [{
        id: Date.now(),
        title: data.title,
        message: data.message,
        notification_type: 'SYSTEM',
        created_at: new Date().toISOString(),
        is_read: false
      }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    const unsubApproval = wsService.on('APPROVAL_ALERT', (data) => {
      setNotifications((prev) => [{
        id: Date.now(),
        title: data.title,
        message: data.message,
        notification_type: 'APPROVAL',
        created_at: new Date().toISOString(),
        is_read: false
      }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubNotif();
      unsubAlert();
      unsubApproval();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/', { method: 'POST', body: {} });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          color: 'var(--slate-700)',
          backgroundColor: varFallback(isOpen, 'var(--slate-100)', 'var(--white)'),
          transition: 'var(--transition)'
        }}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: 'var(--rose-500)',
              color: 'var(--white)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.1rem 0.35rem',
              borderRadius: 'var(--radius-full)',
              minWidth: '18px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(244, 63, 94, 0.4)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: '0.5rem',
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--slate-200)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--slate-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--slate-50)'
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy-900)' }}>
              Notifications ({unreadCount} new)
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--blue-600)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--slate-400)', fontSize: '0.875rem' }}>
                No notifications right now
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--slate-100)',
                    backgroundColor: notif.is_read ? 'var(--white)' : 'var(--blue-50)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--navy-900)' }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={11} /> {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.4 }}>
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function varFallback(cond, t, f) {
  return cond ? t : f;
}
