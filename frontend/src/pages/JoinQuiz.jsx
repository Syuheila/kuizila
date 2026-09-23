import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, User, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../utils/sound';
import LoomiLogo from '../components/LoomiLogo';

export default function JoinQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [sessionCode, setSessionCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = sessionCode.trim().toUpperCase();
    const name = displayName.trim();

    if (!code) {
      setError('Please enter a game code.');
      return;
    }
    if (!name) {
      setError('Please enter your name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      sound.playJoin();
      const res = await api.joinSession(code, name);

      sessionStorage.setItem(`loomi_session_${res.session_code}_pid`, String(res.id));
      sessionStorage.setItem(`loomi_session_${res.session_code}_name`, res.display_name);

      navigate(`/live/participant/${res.session_code}?pid=${res.id}&name=${encodeURIComponent(res.display_name)}`);
    } catch (err) {
      setError(err.message || 'Invalid game code. Please verify the PIN and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: '#0B1120'
      }}
    >
      <div
        className="enterprise-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 28px',
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ marginBottom: '14px' }}>
            <LoomiLogo to="/" size="lg" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
            Join Quiz
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            No account required. Enter your code and name to begin.
          </p>
        </div>

        {error && (
          <div className="auth-alert error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. Game Code */}
          <div className="form-group">
            <label htmlFor="sessionCode" style={{ color: '#E2E8F0', fontWeight: 600, fontSize: '0.85rem' }}>
              Game Code (PIN)
            </label>
            <div className="input-with-icon" style={{ marginTop: '6px' }}>
              <KeyRound size={16} className="input-icon" color="#94A3B8" />
              <input
                id="sessionCode"
                type="text"
                placeholder="SAFE01"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  backgroundColor: '#1E293B',
                  borderColor: '#334155',
                  color: '#38BDF8'
                }}
                maxLength={8}
                required
                autoFocus={!initialCode}
              />
            </div>
          </div>

          {/* 2. Display Name */}
          <div className="form-group">
            <label htmlFor="displayName" style={{ color: '#E2E8F0', fontWeight: 600, fontSize: '0.85rem' }}>
              Your Name
            </label>
            <div className="input-with-icon" style={{ marginTop: '6px' }}>
              <User size={16} className="input-icon" color="#94A3B8" />
              <input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                required
                style={{
                  backgroundColor: '#1E293B',
                  borderColor: '#334155',
                  color: '#F8FAFC'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? 'Entering Quiz...' : 'Join Quiz'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1E293B' }}>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            Are you a trainer?{' '}
            <Link to="/login" style={{ color: '#38BDF8', fontWeight: 600 }}>
              Trainer Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
