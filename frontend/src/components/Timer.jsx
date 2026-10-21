import React, { useState, useEffect, useRef } from 'react';
import { Clock, Flame } from 'lucide-react';
import { sound } from '../utils/sound';

export default function Timer({
  duration = 30,
  initialSeconds = null,
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

  const totalMs = Math.max(1000, (duration || 30) * 1000);

  // Compute fixed target end time ONCE on mount so network polling never causes jumping
  const targetTimeRef = useRef(null);
  if (targetTimeRef.current === null) {
    const secInit = initialSeconds ?? remainingSeconds;
    if (typeof secInit === 'number' && secInit > 0 && secInit <= (duration || 30)) {
      targetTimeRef.current = Date.now() + secInit * 1000;
    } else {
      targetTimeRef.current = Date.now() + totalMs;
    }
  }

  // Track the most recent RAF tick's diffMs for exact millisecond freeze precision
  const currentDiffMsRef = useRef(null);

  // Freeze diffMs the moment isPaused becomes true so subsequent re-renders never move the visual round
  const pausedMsRef = useRef(null);
  if (isPaused) {
    if (pausedMsRef.current === null) {
      pausedMsRef.current = currentDiffMsRef.current !== null
        ? currentDiffMsRef.current
        : Math.max(0, Math.min(totalMs, targetTimeRef.current - Date.now()));
    }
  } else {
    pausedMsRef.current = null;
  }

  const getRemainingMs = () => {
    if (isPaused && pausedMsRef.current !== null) {
      return pausedMsRef.current;
    }
    return Math.max(0, Math.min(totalMs, targetTimeRef.current - Date.now()));
  };

  const getInitial = () => {
    const diffMs = getRemainingMs();
    return {
      sec: Math.max(0, Math.min(duration || 30, Math.ceil(diffMs / 1000))),
      percent: Math.max(0, Math.min(100, (diffMs / totalMs) * 100))
    };
  };

  const initial = getInitial();
  const [timeLeft, setTimeLeft] = useState(initial.sec);

  useEffect(() => {
    if (isPaused) {
      // Immediately freeze the SVG stroke and cancel all animation frames
      if (pathRef.current && pausedMsRef.current !== null) {
        const frozenPercent = Math.max(0, Math.min(100, (pausedMsRef.current / totalMs) * 100));
        pathRef.current.setAttribute('stroke-dasharray', `${frozenPercent.toFixed(2)}, 100`);
      }
      return;
    }

    timeUpFiredRef.current = false;
    lastSecRef.current = null;
    const targetTime = targetTimeRef.current;

    let rafId = null;

    const tick = () => {
      const now = Date.now();
      const diffMs = Math.max(0, Math.min(totalMs, targetTime - now));
      currentDiffMsRef.current = diffMs;
      const fraction = Math.max(0, Math.min(1, diffMs / totalMs));
      const percent = fraction * 100;

      // 60 FPS butter-smooth SVG ring animation
      if (pathRef.current) {
        pathRef.current.setAttribute('stroke-dasharray', `${percent.toFixed(2)}, 100`);
      }

      // Discrete integer seconds update (only re-renders text once per second: 30, 29, 28...)
      const sec = Math.max(0, Math.min(duration || 30, Math.ceil(diffMs / 1000)));
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
  }, [duration, isPaused, isTimeBomb]);

  const displayMs = getRemainingMs();
  const displaySec = Math.max(0, Math.min(duration || 30, Math.ceil(displayMs / 1000)));
  const displayPercent = Math.max(0, Math.min(100, (displayMs / totalMs) * 100));

  const isUrgent = displaySec <= 5;
  const isDanger = displaySec <= 3;

  let timerColor = 'var(--color-teal)';
  if (isDanger) timerColor = 'var(--color-danger)';
  else if (isUrgent) timerColor = 'var(--color-accent)';

  return (
    <div
      className={isTimeBomb && isUrgent && !isPaused ? 'timebomb-active' : ''}
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
        userSelect: 'none',
        opacity: isPaused ? 0.85 : 1
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
            strokeDasharray={`${displayPercent.toFixed(2)}, 100`}
            strokeLinecap="round"
            style={{ transition: isPaused ? 'none' : 'stroke 0.3s ease' }}
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
          {isPaused ? displaySec : timeLeft}s
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {isPaused ? 'PAUSED' : (isTimeBomb && isUrgent ? 'TIME BOMB' : 'REMAINING')}
        </div>
      </div>
    </div>
  );
}
