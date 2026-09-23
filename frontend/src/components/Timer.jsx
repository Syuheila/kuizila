import React, { useState, useEffect, useRef } from 'react';
import { Clock, Flame } from 'lucide-react';
import { sound } from '../utils/sound';

export default function Timer({
  duration = 30,
  endsAt = null,
  remainingSeconds = null,
  serverTime = null,
  onTimeUp,
  isTimeBomb = false,
  isPaused = false
}) {
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const timeUpFiredRef = useRef(false);
  const pathRef = useRef(null);
  const lastSecRef = useRef(null);

  // Compute initial remaining ms & percent
  const getInitial = () => {
    const totalMs = Math.max(1000, (duration || 30) * 1000);
    if (endsAt) {
      const targetTime = new Date(endsAt).getTime();
      const clockOffset = serverTime ? Date.now() - new Date(serverTime).getTime() : 0;
      const currentClientTime = Date.now() - clockOffset;
      const diffMs = Math.max(0, targetTime - currentClientTime);
      return {
        sec: Math.max(0, Math.ceil(diffMs / 1000)),
        percent: Math.max(0, Math.min(100, (diffMs / totalMs) * 100))
      };
    }
    if (typeof remainingSeconds === 'number') {
      const remSec = Math.max(0, remainingSeconds);
      return {
        sec: remSec,
        percent: Math.max(0, Math.min(100, (remSec / (duration || 1)) * 100))
      };
    }
    return {
      sec: duration || 30,
      percent: 100
    };
  };

  const initial = getInitial();
  const [timeLeft, setTimeLeft] = useState(initial.sec);

  useEffect(() => {
    timeUpFiredRef.current = false;
    lastSecRef.current = null;

    const totalMs = Math.max(1000, (duration || 30) * 1000);
    let targetTime;
    let clockOffset = 0;

    if (endsAt) {
      targetTime = new Date(endsAt).getTime();
      clockOffset = serverTime ? Date.now() - new Date(serverTime).getTime() : 0;
    } else if (typeof remainingSeconds === 'number') {
      targetTime = Date.now() + remainingSeconds * 1000;
    } else {
      targetTime = Date.now() + totalMs;
    }

    let rafId = null;

    const tick = () => {
      if (isPaused) return;

      const now = Date.now() - clockOffset;
      const diffMs = Math.max(0, targetTime - now);
      const fraction = Math.max(0, Math.min(1, diffMs / totalMs));
      const percent = fraction * 100;

      // 60 FPS butter-smooth stroke animation without choppy CSS transition fights
      if (pathRef.current) {
        pathRef.current.setAttribute('stroke-dasharray', `${percent.toFixed(2)}, 100`);
      }

      // Discrete integer seconds update (only re-renders text once per second)
      const sec = Math.max(0, Math.ceil(diffMs / 1000));
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setTimeLeft(sec);

        if (isTimeBomb && sec <= 5 && sec > 0) {
          sound.playTimerTick(true);
        } else if (sec <= 3 && sec > 0) {
          sound.playTimerTick(false);
        }
      }

      if (diffMs <= 0) {
        if (pathRef.current) {
          pathRef.current.setAttribute('stroke-dasharray', '0, 100');
        }
        if (!timeUpFiredRef.current && onTimeUpRef.current) {
          timeUpFiredRef.current = true;
          onTimeUpRef.current();
        }
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    // Trigger immediate first frame
    tick();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [endsAt, remainingSeconds, duration, serverTime, isPaused, isTimeBomb]);

  const isUrgent = timeLeft <= 5;
  const isDanger = timeLeft <= 3;

  let timerColor = 'var(--color-teal)';
  if (isDanger) timerColor = 'var(--color-danger)';
  else if (isUrgent) timerColor = 'var(--color-accent)';

  return (
    <div
      className={isTimeBomb && isUrgent ? 'timebomb-active' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        backgroundColor: '#1E293B',
        borderRadius: 9999,
        border: `2px solid ${timerColor}`,
        boxShadow: isUrgent ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'var(--shadow-sm)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        userSelect: 'none'
      }}
    >
      <div style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#334155"
            strokeWidth="3.5"
          />
          <path
            ref={pathRef}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={timerColor}
            strokeWidth="3.5"
            strokeDasharray={`${initial.percent.toFixed(2)}, 100`}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          color: timerColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.3s ease'
        }}>
          {isTimeBomb && isUrgent ? <Flame size={16} /> : <Clock size={16} />}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.3rem',
          fontWeight: 800,
          color: timerColor,
          lineHeight: 1,
          minWidth: '40px',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.3s ease'
        }}>
          {timeLeft}s
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {isTimeBomb && isUrgent ? 'TIME BOMB' : 'REMAINING'}
        </div>
      </div>
    </div>
  );
}
