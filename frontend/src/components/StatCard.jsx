import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: { bg: 'var(--blue-50)', text: 'var(--blue-600)', border: 'rgba(37, 99, 235, 0.15)' },
    emerald: { bg: 'var(--emerald-50)', text: 'var(--emerald-600)', border: 'rgba(16, 185, 129, 0.15)' },
    purple: { bg: 'var(--purple-50)', text: 'var(--purple-600)', border: 'rgba(124, 58, 237, 0.15)' },
    amber: { bg: 'var(--amber-50)', text: 'var(--amber-500)', border: 'rgba(245, 158, 11, 0.15)' },
    navy: { bg: 'var(--navy-900)', text: 'var(--white)', border: 'rgba(255, 255, 255, 0.1)' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy-950)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
            {value}
          </div>
        </div>
        {Icon && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: scheme.bg,
              color: scheme.text,
              border: `1px solid ${scheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
          {trend && (
            <span
              style={{
                color: trend > 0 ? 'var(--emerald-600)' : 'var(--rose-600)',
                fontWeight: 700,
                backgroundColor: trend > 0 ? 'var(--emerald-50)' : 'var(--rose-50)',
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
