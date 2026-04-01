import React from 'react';

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel',
  type = 'danger', onConfirm, onCancel, onClose, details
}) {
  if (!open) return null;
  const handleCancel = onCancel || onClose || (() => {});

  const colors = {
    danger:  { main: '#dc2626', bg: '#fee2e2', icon: '🗑️',  border: '#fca5a5' },
    warning: { main: '#d97706', bg: '#fef9c3', icon: '⚠️',  border: '#fcd34d' },
    info:    { main: '#2563eb', bg: '#dbeafe', icon: 'ℹ️',  border: '#93c5fd' },
  };
  const c = colors[type] || colors.danger;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, backdropFilter: 'blur(2px)',
    }}
      onClick={e => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div style={{
        background: 'white', borderRadius: 12, padding: '28px 32px',
        maxWidth: 420, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        animation: 'modalIn .15s ease-out',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: c.bg, border: `2px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 16px',
        }}>
          {c.icon}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 10 }}>
          {title}
        </div>

        {/* Message */}
        <div style={{ textAlign: 'center', fontSize: 14, color: '#4b5563', lineHeight: 1.6, marginBottom: details ? 6 : 24 }}>
          {message}
        </div>

        {/* Details */}
        {details && (
          <div style={{
            textAlign: 'center', fontSize: 12, color: '#6b7280',
            background: '#f9fafb', borderRadius: 6, padding: '8px 12px',
            margin: '0 0 24px', border: '1px solid #e5e7eb',
          }}>
            {details}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1, padding: '10px 20px', fontSize: 13, fontWeight: 600,
              border: '1.5px solid #d1d5db', borderRadius: 8, cursor: 'pointer',
              background: 'white', color: '#374151',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#9ca3af'; }}
            onMouseLeave={e => { e.target.style.background = 'white';   e.target.style.borderColor = '#d1d5db'; }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px 20px', fontSize: 13, fontWeight: 700,
              border: 'none', borderRadius: 8, cursor: 'pointer',
              background: c.main, color: 'white',
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { e.target.style.opacity = '.85'; }}
            onMouseLeave={e => { e.target.style.opacity = '1'; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { transform: scale(.9); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
