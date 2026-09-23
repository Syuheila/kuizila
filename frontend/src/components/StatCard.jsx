import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'teal', trend = null }) {
  const colorMap = {
    teal: { bg: 'var(--color-teal-subtle)', text: 'var(--color-teal)', border: 'rgba(15, 118, 110, 0.2)' },
    navy: { bg: '#E0F2FE', text: '#0369A1', border: 'rgba(3, 105, 161, 0.2)' },
    gold: { bg: 'var(--color-accent-light)', text: 'var(--color-accent-dark)', border: 'rgba(217, 119, 6, 0.2)' },
    emerald: { bg: '#D1FAE5', text: '#059669', border: 'rgba(5, 150, 105, 0.2)' }
  };

  const currentTheme = colorMap[color] || colorMap.teal;

  return (
    <div className="loomi-card loomi-card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: currentTheme.bg,
            border: `1px solid ${currentTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: currentTheme.text
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2rem',
          fontWeight: 800,
          color: 'var(--color-primary-dark)',
          lineHeight: 1
        }}>
          {value}
        </div>
        {trend && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: trend.startsWith('+') ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
