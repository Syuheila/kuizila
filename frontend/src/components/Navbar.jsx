import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  LayoutDashboard,
  FolderOpen,
  Database,
  Sparkles,
  BarChart3,
  Volume2,
  VolumeX,
  PlayCircle,
  UserCheck,
  Trophy
} from 'lucide-react';
import { sound } from '../utils/sound';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [muted, setMuted] = useState(sound.isMuted());

  const handleSoundToggle = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sound.playJoin();
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Quizzes', path: '/quizzes', icon: FolderOpen },
    { label: 'Question Bank', path: '/questions', icon: Database },
    { label: 'AI Assistant', path: '/ai-assistant', icon: Sparkles },
    { label: 'Reports', path: '/reports', icon: BarChart3 }
  ];

  // Hide nav links in live participant screen for immersion
  const isLiveParticipant = location.pathname.startsWith('/live/') || location.pathname === '/join' || location.pathname.startsWith('/waiting/');

  return (
    <header style={{
      backgroundColor: '#1E293B',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #123B5D 0%, #0F766E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 6px rgba(15, 118, 110, 0.3)'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #123B5D 30%, #0F766E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1
            }}>
              Loomi
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              ENGAGE & MEASURE
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        {!isLiveParticipant && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: isActive ? 'var(--color-teal)' : 'var(--text-muted)',
                    backgroundColor: isActive ? 'var(--color-teal-subtle)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={17} color={isActive ? 'var(--color-teal)' : 'currentColor'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              color: muted ? 'var(--text-light)' : 'var(--color-teal)',
              backgroundColor: muted ? '#F8FAFC' : 'var(--color-teal-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Join Quiz Quick Action */}
          <Link
            to="/join"
            className="btn btn-outline btn-sm"
            style={{ fontWeight: 600, borderColor: 'var(--color-teal)', color: 'var(--color-teal)' }}
          >
            <PlayCircle size={16} />
            <span>Join as Employee</span>
          </Link>

          {/* Player Profile Link */}
          <Link
            to="/profile"
            title="View Player Profile & Badges"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              backgroundColor: location.pathname === '/profile' ? 'var(--color-teal-subtle)' : '#F8FAFC',
              border: `1px solid ${location.pathname === '/profile' ? 'var(--color-teal)' : 'var(--border-subtle)'}`,
              color: location.pathname === '/profile' ? 'var(--color-teal)' : 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 700
            }}
          >
            <Trophy size={16} color="var(--color-accent)" />
            <span>Profile & Badges</span>
          </Link>

          {/* User Profile Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px 4px 6px',
            borderRadius: 9999,
            backgroundColor: '#0F172A',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.name || 'Suhailah Desa'}
            </div>
            <span className="badge badge-navy" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
              {(user?.role || 'admin').toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
