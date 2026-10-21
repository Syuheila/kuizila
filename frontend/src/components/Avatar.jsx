import React from 'react';
import { Crown, Flame, Shield, Skull } from 'lucide-react';

/**
 * Kuizila Original Modular SVG Avatar Renderer
 * 100% original vector geometry with customizable base, hair, outfits, accessories, frames, and micro-animations.
 */

export const AVATAR_BASES = [
  { id: 'professional', name: 'Professional', icon: '👔', defaultColor: '#0F766E' },
  { id: 'techie', name: 'Techie', icon: '💻', defaultColor: '#123B5D' },
  { id: 'scientist', name: 'Scientist', icon: '🔬', defaultColor: '#0284C7' },
  { id: 'champion', name: 'Champion', icon: '🏆', defaultColor: '#D97706' },
  { id: 'robot', name: 'Automaton', icon: '🤖', defaultColor: '#475569' },
  { id: 'detective', name: 'Analyst', icon: '🕵️', defaultColor: '#6366F1' },
  { id: 'explorer', name: 'Explorer', icon: '🧭', defaultColor: '#059669' },
  { id: 'astronaut', name: 'Pioneer', icon: '🚀', defaultColor: '#7C3AED' }
];

export const AVATAR_HAIR = [
  { id: 'sleek', name: 'Sleek' },
  { id: 'curly', name: 'Curly' },
  { id: 'buzz', name: 'Buzz' },
  { id: 'waves', name: 'Waves' },
  { id: 'spiky', name: 'Spiky' },
  { id: 'none', name: 'Clean / None' }
];

export const AVATAR_OUTFITS = [
  { id: 'formal', name: 'Formal Suit & Collar' },
  { id: 'blazer', name: 'Smart Blazer' },
  { id: 'hoodie', name: 'Casual Tech Hoodie' },
  { id: 'labcoat', name: 'Lab Coat' },
  { id: 'techvest', name: 'Tactical Tech Vest' }
];

export const AVATAR_ACCESSORIES = [
  { id: 'none', name: 'None' },
  { id: 'glasses', name: 'Smart Glasses' },
  { id: 'headset', name: 'Audio Headset' },
  { id: 'badge', name: 'Gold Security Badge' },
  { id: 'tie', name: 'Executive Tie' }
];

export const AVATAR_BACKGROUNDS = [
  { id: 'teal', name: 'Teal Mist', value: '#CCFBF1' },
  { id: 'blue', name: 'Navy Glow', value: '#E0F2FE' },
  { id: 'amber', name: 'Warm Amber', value: '#FEF3C7' },
  { id: 'emerald', name: 'Soft Emerald', value: '#D1FAE5' },
  { id: 'purple', name: 'Electric Purple', value: '#EDE9FE' },
  { id: 'slate', name: 'Clean Slate', value: '#F1F5F9' }
];

export const AVATAR_FRAMES = [
  { id: 'none', name: 'None', border: 'transparent' },
  { id: 'gold', name: 'Gold Trophy', border: '#F59E0B' },
  { id: 'silver', name: 'Platinum Silver', border: '#94A3B8' },
  { id: 'teal', name: 'Corporate Teal', border: '#0F766E' },
  { id: 'neon', name: 'Electric Blue', border: '#2563EB' }
];

export const AVATAR_PRESETS = [
  {
    id: 'executive',
    name: 'Executive Leader',
    config: {
      base: 'professional',
      color: '#0F766E',
      hair: 'sleek',
      outfit: 'formal',
      accessory: 'tie',
      bg: '#CCFBF1',
      frame: 'gold'
    }
  },
  {
    id: 'tech_lead',
    name: 'Lead Engineer',
    config: {
      base: 'techie',
      color: '#123B5D',
      hair: 'buzz',
      outfit: 'hoodie',
      accessory: 'headset',
      bg: '#E0F2FE',
      frame: 'neon'
    }
  },
  {
    id: 'analyst',
    name: 'Compliance Officer',
    config: {
      base: 'detective',
      color: '#6366F1',
      hair: 'waves',
      outfit: 'blazer',
      accessory: 'glasses',
      bg: '#EDE9FE',
      frame: 'silver'
    }
  },
  {
    id: 'champion',
    name: 'Knowledge Champion',
    config: {
      base: 'champion',
      color: '#D97706',
      hair: 'curly',
      outfit: 'formal',
      accessory: 'badge',
      bg: '#FEF3C7',
      frame: 'gold'
    }
  },
  {
    id: 'scientist',
    name: 'AI Strategist',
    config: {
      base: 'scientist',
      color: '#0284C7',
      hair: 'spiky',
      outfit: 'labcoat',
      accessory: 'glasses',
      bg: '#E0F2FE',
      frame: 'teal'
    }
  },
  {
    id: 'automaton',
    name: 'Cyber Automaton',
    config: {
      base: 'robot',
      color: '#475569',
      hair: 'none',
      outfit: 'techvest',
      accessory: 'headset',
      bg: '#F1F5F9',
      frame: 'neon'
    }
  }
];

export default function Avatar({
  config = {},
  size = 48,
  animate = false,
  status = null, // 'crown', 'streak', 'eliminated', 'shield'
  isWinning = false,
  className = '',
  style = {}
}) {
  // Normalize config
  let c = config;
  if (typeof config === 'string') {
    try {
      c = JSON.parse(config);
    } catch {
      c = {};
    }
  }
  c = c || {};

  const base = c.base || 'professional';
  const color = c.color || '#0F766E';
  const hair = c.hair || 'sleek';
  const outfit = c.outfit || 'formal';
  const accessory = c.accessory || 'none';
  const bg = c.bg || '#E0F2FE';
  const frame = c.frame || 'none';

  const frameBorderColor =
    frame === 'gold' ? '#F59E0B' :
    frame === 'silver' ? '#94A3B8' :
    frame === 'teal' ? '#0F766E' :
    frame === 'neon' ? '#2563EB' : 'transparent';

  const isEliminated = status === 'eliminated' || c.is_eliminated;

  return (
    <div
      className={`kuizila-avatar-container ${animate ? 'kuizila-avatar-idle' : ''} ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: frame !== 'none' ? `0 0 0 ${Math.max(2, Math.round(size / 24))}px ${frameBorderColor}` : 'var(--shadow-sm)',
        backgroundColor: bg,
        filter: isEliminated ? 'grayscale(0.9) opacity(0.55)' : 'none',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ borderRadius: '50%', overflow: 'hidden' }}
      >
        {/* Background Fill */}
        <circle cx="50" cy="50" r="48" fill={bg} />

        {/* Character Base Body & Head */}
        {base === 'robot' ? (
          <g>
            {/* Robot Head */}
            <rect x="30" y="24" width="40" height="34" rx="8" fill={color} />
            {/* Antenna */}
            <line x1="50" y1="24" x2="50" y2="14" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="12" r="4" fill="#F59E0B" />
            {/* Robot Visor/Eyes */}
            <rect x="36" y="34" width="28" height="10" rx="3" fill="#38BDF8" />
            <circle cx="43" cy="39" r="2" fill="#FFFFFF" />
            <circle cx="57" cy="39" r="2" fill="#FFFFFF" />
            {/* Robot Cheeks */}
            <circle cx="34" cy="48" r="2" fill="#94A3B8" />
            <circle cx="66" cy="48" r="2" fill="#94A3B8" />
            {/* Robot Neck */}
            <rect x="44" y="58" width="12" height="6" fill="#64748B" />
          </g>
        ) : (
          <g>
            {/* Humanoid Head */}
            <circle cx="50" cy="40" r="20" fill="#FDE68A" />
            {/* Cheeks */}
            <circle cx="37" cy="45" r="3" fill="#FCA5A5" opacity="0.6" />
            <circle cx="63" cy="45" r="3" fill="#FCA5A5" opacity="0.6" />
            {/* Eyes */}
            <circle cx="43" cy="39" r="2.5" fill="#1E293B" />
            <circle cx="57" cy="39" r="2.5" fill="#1E293B" />
            <circle cx="44" cy="38" r="0.8" fill="#FFFFFF" />
            <circle cx="58" cy="38" r="0.8" fill="#FFFFFF" />
            {/* Friendly Smile */}
            <path d="M 44 48 Q 50 53 56 48" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Neck */}
            <rect x="46" y="58" width="8" height="8" fill="#FDE68A" />
          </g>
        )}

        {/* Hairstyle */}
        {base !== 'robot' && hair !== 'none' && (
          <g fill={color}>
            {hair === 'sleek' && (
              <path d="M 30 36 C 30 20, 70 20, 70 36 C 70 28, 62 23, 50 23 C 38 23, 30 28, 30 36 Z" />
            )}
            {hair === 'curly' && (
              <g>
                <circle cx="36" cy="26" r="8" />
                <circle cx="50" cy="23" r="9" />
                <circle cx="64" cy="26" r="8" />
                <circle cx="30" cy="34" r="6" />
                <circle cx="70" cy="34" r="6" />
              </g>
            )}
            {hair === 'buzz' && (
              <path d="M 33 34 C 33 24, 67 24, 67 34 Z" fill="#334155" />
            )}
            {hair === 'spiky' && (
              <path d="M 30 34 L 38 18 L 46 25 L 52 16 L 58 25 L 66 18 L 70 34 Z" />
            )}
            {hair === 'waves' && (
              <path d="M 28 36 C 28 18, 72 18, 72 36 C 72 46, 68 48, 68 48 C 66 32, 60 25, 50 25 C 40 25, 34 32, 32 48 Z" />
            )}
          </g>
        )}

        {/* Outfits (Shoulders & Chest) */}
        {outfit === 'formal' && (
          <g>
            {/* Suit shoulders */}
            <path d="M 20 100 L 20 80 Q 20 64 50 64 Q 80 64 80 80 L 80 100 Z" fill={color} />
            {/* Shirt collar */}
            <polygon points="50,65 42,76 58,76" fill="#FFFFFF" />
            {/* Tie */}
            <polygon points="50,72 47,94 50,98 53,94" fill="#EF4444" />
          </g>
        )}
        {outfit === 'blazer' && (
          <g>
            <path d="M 20 100 L 20 80 Q 20 64 50 64 Q 80 64 80 100 Z" fill={color} />
            <polygon points="50,64 36,80 50,96 64,80" fill="#F8FAFC" />
            <line x1="50" y1="78" x2="50" y2="100" stroke="#CBD5E1" strokeWidth="2" />
          </g>
        )}
        {outfit === 'hoodie' && (
          <g>
            <path d="M 20 100 L 20 80 Q 20 64 50 64 Q 80 64 80 100 Z" fill={color} />
            <circle cx="50" cy="67" r="13" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
          </g>
        )}
        {outfit === 'labcoat' && (
          <g>
            <path d="M 20 100 L 20 80 Q 20 64 50 64 Q 80 64 80 100 Z" fill="#F8FAFC" />
            <line x1="50" y1="64" x2="50" y2="100" stroke="#0284C7" strokeWidth="3" />
            <rect x="28" y="76" width="10" height="12" rx="2" fill="#E2E8F0" />
          </g>
        )}
        {outfit === 'techvest' && (
          <g>
            <path d="M 20 100 L 20 80 Q 20 64 50 64 Q 80 64 80 100 Z" fill="#1E293B" />
            <rect x="32" y="74" width="14" height="10" rx="2" fill="#3B82F6" />
            <rect x="54" y="74" width="14" height="10" rx="2" fill="#3B82F6" />
          </g>
        )}

        {/* Accessories */}
        {accessory === 'glasses' && base !== 'robot' && (
          <g stroke="#1E293B" strokeWidth="2" fill="none">
            <rect x="36" y="34" width="11" height="9" rx="2" fill="#38BDF8" fillOpacity="0.25" />
            <rect x="53" y="34" width="11" height="9" rx="2" fill="#38BDF8" fillOpacity="0.25" />
            <line x1="47" y1="38" x2="53" y2="38" />
            <line x1="36" y1="38" x2="30" y2="37" />
            <line x1="64" y1="38" x2="70" y2="37" />
          </g>
        )}
        {accessory === 'headset' && (
          <g>
            <path d="M 28 40 A 22 22 0 0 1 72 40" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
            <rect x="25" y="36" width="6" height="12" rx="3" fill="#3B82F6" />
            <rect x="69" y="36" width="6" height="12" rx="3" fill="#3B82F6" />
            <path d="M 31 46 L 42 54" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
            <circle cx="43" cy="54" r="2.5" fill="#EF4444" />
          </g>
        )}
        {accessory === 'badge' && (
          <polygon points="62,72 65,77 71,78 67,82 68,87 63,84 58,87 59,82 55,78 61,77" fill="#F59E0B" />
        )}
      </svg>

      {/* Floating Status Badges */}
      {status === 'crown' && (
        <div style={{
          position: 'absolute',
          top: -Math.round(size * 0.22),
          right: -Math.round(size * 0.1),
          backgroundColor: '#F59E0B',
          borderRadius: '50%',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
          border: '1.5px solid #FFFFFF'
        }}>
          <Crown size={Math.max(12, Math.round(size * 0.32))} color="#FFFFFF" fill="#FFFFFF" />
        </div>
      )}

      {status === 'streak' && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          backgroundColor: '#EF4444',
          borderRadius: '50%',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
          border: '1.5px solid #FFFFFF'
        }}>
          <Flame size={Math.max(10, Math.round(size * 0.28))} color="#FFFFFF" fill="#FFFFFF" />
        </div>
      )}

      {status === 'shield' && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          backgroundColor: '#0284C7',
          borderRadius: '50%',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid #FFFFFF'
        }}>
          <Shield size={Math.max(10, Math.round(size * 0.28))} color="#FFFFFF" fill="#FFFFFF" />
        </div>
      )}

      {isEliminated && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Skull size={Math.max(14, Math.round(size * 0.45))} color="#FFFFFF" />
        </div>
      )}
    </div>
  );
}
