import React from 'react';
import { Link } from 'react-router-dom';

/**
 * LoomiLogo Component
 * Original geometric modern brand mark & wordmark designed for dark UI.
 * Features an interactive glowing geometric prism/node symbol paired with customized lettering.
 *
 * Props:
 * - compact: boolean (show only symbol)
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - to: string (optional link path, defaults to '/')
 * - clickable: boolean (whether to wrap in a Link, default: true)
 */
export default function LoomiLogo({
  compact = false,
  size = 'md',
  to = '/',
  clickable = true,
  className = ''
}) {
  const sizeMap = {
    sm: { icon: 24, font: '1.05rem', gap: 7 },
    md: { icon: 32, font: '1.35rem', gap: 9 },
    lg: { icon: 42, font: '1.75rem', gap: 12 }
  };

  const { icon: iconSize, font: fontSize, gap } = sizeMap[size] || sizeMap.md;

  const symbol = (
    <div
      style={{
        width: iconSize,
        height: iconSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.45))' }}
      >
        <defs>
          <linearGradient id="loomiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="loomiAccent" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Hexagon / Diamond Frame */}
        <rect
          x="6"
          y="6"
          width="36"
          height="36"
          rx="10"
          transform="rotate(45 24 24)"
          fill="url(#loomiGrad)"
        />

        {/* Inner geometric light core */}
        <rect
          x="14"
          y="14"
          width="20"
          height="20"
          rx="5"
          transform="rotate(45 24 24)"
          fill="#0B1120"
        />

        {/* Center luminous spark node */}
        <circle cx="24" cy="24" r="4" fill="url(#loomiAccent)" />
        <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
      </svg>
    </div>
  );

  const wordmark = (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
        fontSize: fontSize,
        fontWeight: 800,
        letterSpacing: '-0.035em',
        display: 'inline-flex',
        alignItems: 'baseline',
        lineHeight: 1
      }}
    >
      <span
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 30%, #E2E8F0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        KUIZ
      </span>
      <span
        style={{
          background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #8B5CF6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          position: 'relative'
        }}
      >
        ILA
      </span>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: '#06B6D4',
          display: 'inline-block',
          marginLeft: 3,
          boxShadow: '0 0 6px #06B6D4'
        }}
      />
    </span>
  );

  const content = (
    <div
      className={`loomi-brand kuizila-brand ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${gap}px`,
        textDecoration: 'none',
        userSelect: 'none',
        cursor: 'pointer'
      }}
    >
      {symbol}
      {!compact && wordmark}
    </div>
  );

  const destination = to || '/';

  if (clickable !== false) {
    return (
      <Link
        to={destination}
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          cursor: 'pointer'
        }}
        title="Kuizila Homepage"
        aria-label="Kuizila Homepage"
      >
        {content}
      </Link>
    );
  }

  return content;
}
