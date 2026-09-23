import React from 'react';
import { Users, Wifi, UserCheck, Shield, Heart } from 'lucide-react';
import Avatar from './Avatar';

export default function ParticipantList({ participants = [] }) {
  if (!participants || participants.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '36px 20px',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        border: '2px dashed var(--border-medium)'
      }}>
        <Users size={40} color="var(--text-light)" style={{ marginBottom: 10 }} />
        <h4 style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Waiting for employees to join...</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 4 }}>
          Share the 6-character PIN or URL with participants to begin.
        </p>
      </div>
    );
  }

  // Generate distinct pastel avatar background colors
  const avatarColors = [
    { bg: '#E0F2FE', text: '#0369A1' },
    { bg: '#FEF3C7', text: '#D97706' },
    { bg: '#DCFCE7', text: '#15803D' },
    { bg: '#F3E8FF', text: '#7E22CE' },
    { bg: '#FFE4E6', text: '#BE123C' },
    { bg: '#CCFBF1', text: '#0F766E' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={18} color="var(--color-teal)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
            Joined Contenders ({participants.length})
          </span>
        </div>
        <span className="badge badge-teal">
          <Wifi size={12} /> Live Connected
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12
      }}>
        {participants.map((p, idx) => {
          const color = avatarColors[idx % avatarColors.length];
          let avatarCfg = null;
          if (p.avatar_config) {
            try {
              avatarCfg = typeof p.avatar_config === 'string' ? JSON.parse(p.avatar_config) : p.avatar_config;
            } catch {
              avatarCfg = null;
            }
          }

          return (
            <div
              key={p.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                backgroundColor: '#1E293B',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                animation: 'fadeIn 0.3s ease-in',
                opacity: p.is_eliminated ? 0.6 : 1
              }}
            >
              {avatarCfg ? (
                <Avatar config={avatarCfg} size={42} showStatus={!p.is_eliminated} />
              ) : (
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: color.bg,
                  color: color.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  flexShrink: 0
                }}>
                  {p.display_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {p.display_name}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                  {p.team_name ? (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(18, 59, 93, 0.1)',
                      color: 'var(--color-primary-dark)'
                    }}>
                      {p.team_name}
                    </span>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: p.is_eliminated ? '#EF4444' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: p.is_eliminated ? '#EF4444' : 'var(--color-success)', display: 'inline-block' }}></span>
                      {p.is_eliminated ? 'Eliminated' : 'Ready'}
                    </div>
                  )}

                  {p.remaining_lives !== undefined && p.remaining_lives !== null && p.remaining_lives > 0 && (
                    <span style={{ fontSize: '0.65rem', color: '#EF4444', fontWeight: 800 }}>
                      {'❤️'.repeat(Math.min(3, p.remaining_lives))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
