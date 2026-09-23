import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/sound';

export default function SoundToggle({ style = {} }) {
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [isBlocked, setIsBlocked] = useState(sound.isAutoplayBlocked);

  useEffect(() => {
    return sound.subscribe((muted, blocked) => {
      setIsMuted(muted);
      setIsBlocked(blocked);
    });
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    sound.init();
    const newMuted = sound.toggleMute();
    setIsMuted(newMuted);
    setIsBlocked(sound.isAutoplayBlocked);
  };

  if (isBlocked && !isMuted) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title="Browser paused soundtrack until clicked. Click to enable music!"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '7px 12px',
          borderRadius: 8,
          border: '1px solid #38BDF8',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          color: '#38BDF8',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700,
          animation: 'pulse 1.8s infinite',
          transition: 'all 0.15s',
          ...style
        }}
      >
        <Volume2 size={16} />
        <span>▶ Tap for Music 🎵</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isMuted ? 'Turn Sound & Music ON' : 'Mute Sound & Music'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 8,
        border: `1px solid ${isMuted ? '#475569' : 'var(--color-teal)'}`,
        backgroundColor: isMuted ? 'rgba(30, 41, 59, 0.8)' : 'rgba(20, 184, 166, 0.15)',
        color: isMuted ? '#94A3B8' : '#2DD4BF',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 600,
        transition: 'all 0.15s',
        ...style
      }}
    >
      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      <span>{isMuted ? 'Muted' : 'Music On'}</span>
    </button>
  );
}
