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

  // Compute remaining time from server-authoritative endsAt or remainingSeconds
  const getRemaining = () => {
    if (endsAt) {
      const targetTime = new Date(endsAt).getTime();
      const clockOffset = serverTime ? Date.now() - new Date(serverTime).getTime() : 0;
      const currentClientTime = Date.now() - clockOffset;
      const diffMs = targetTime - currentClientTime;
      return Math.max(0, Math.ceil(diffMs / 1000));
    }
    if (typeof remainingSeconds === 'number') {
      return Math.max(0, remainingSeconds);
    }
    return duration;
  };

  const [timeLeft, setTimeLeft] = useState(getRemaining);

  // Synchronize when question endsAt / remainingSeconds / duration changes
  useEffect(() => {
    timeUpFiredRef.current = false;
    setTimeLeft(getRemaining());
  }, [endsAt, remainingSeconds, duration, serverTime]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const remaining = getRemaining();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (!timeUpFiredRef.current && onTimeUpRef.current) {
          timeUpFiredRef.current = true;
          onTimeUpRef.current();
        }
      } else {
        if (isTimeBomb && remaining <= 5) {
          sound.playTimerTick(true);
        } else if (remaining <= 3) {
          sound.playTimerTick(false);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [endsAt, remainingSeconds, duration, serverTime, isPaused, isTimeBomb]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / (duration || 1)) * 100));
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
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="3.5"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={timerColor}
            strokeWidth="3.5"
            strokeDasharray={`${percentage}, 100`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          color: timerColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
          lineHeight: 1
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
