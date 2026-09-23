import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  ArrowLeft,
  Trophy,
  Users,
  Copy,
  Check,
  StopCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  BookOpen,
  RefreshCw,
  Lightbulb,
  Target
} from 'lucide-react';
import LoomiLogo from '../components/LoomiLogo';
import Modal from '../components/Modal';
import SoundToggle from '../components/SoundToggle';
import { LoomiSocket } from '../services/websocket';
import { api } from '../services/api';
import { sound } from '../utils/sound';

export default function LiveHost() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);

  // AI Quiz Insights State
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [insightsError, setInsightsError] = useState('');
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 2500);
    return () => clearInterval(interval);
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const data = await api.getSession(sessionId);
      setSession(data);
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!sessionId) return;
    setInsightsLoading(true);
    setInsightsError('');
    try {
      const data = await api.getAIQuizInsights(sessionId);
      setInsightsData(data);
    } catch (err) {
      setInsightsError(err.message || 'Failed to load AI Quiz Insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.session_status === 'completed' && !insightsData && !insightsLoading && !insightsError) {
      fetchInsights();
    }
  }, [session?.session_status]);

  // Play Lobby soundtrack while participants are joining
  useEffect(() => {
    if (session?.session_status === 'waiting') {
      sound.playLobbyMusic();
    } else {
      sound.stopMusic();
    }
    return () => {
      sound.stopMusic();
    };
  }, [session?.session_status]);

  useEffect(() => {
    if (!session?.session_code) return;

    const socket = new LoomiSocket(session.session_code, 'host', null, 'Host', (event) => {
      console.log('[Host WS]', event);
      if (event.event === 'PARTICIPANT_JOINED') {
        sound.playJoin();
        api.getSession(sessionId).then(setSession);
      } else if (event.event === 'PARTICIPANT_PROGRESS') {
        api.getSession(sessionId).then(setSession);
      } else if (event.event === 'ANSWER_SUBMITTED') {
        api.getSession(sessionId).then(setSession);
      }
    });

    socket.connect();
    return () => socket.disconnect();
  }, [session?.session_code, sessionId]);

  const copyJoinLink = () => {
    const url = `${window.location.origin}/join?code=${session?.session_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStartSession = async () => {
    try {
      sound.playBattleStart();
      const updated = await api.startSession(sessionId);
      setSession(updated);
    } catch (err) {
      alert(`Could not start session: ${err.message}`);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to conclude this live quiz?')) return;
    try {
      sound.playFanfare();
      const updated = await api.endSession(sessionId);
      setSession(updated);
    } catch (err) {
      alert(`Could not end session: ${err.message}`);
    }
  };

  if (loading || !session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        Loading host control room...
      </div>
    );
  }

  const status = session.session_status;
  const participants = session.participants || [];
  const answeringCount = session.answering_count ?? participants.filter(p => p.status === 'answering').length;
  const completedCount = session.completed_count ?? participants.filter(p => p.status === 'completed').length;
  const totalCount = session.participant_count || participants.length;

  return (
    <div className="live-host-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LoomiLogo to="/" size="md" />
          <span className="badge-pill brand" style={{ fontSize: '0.78rem' }}>Host Monitoring Room</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SoundToggle />
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} />
            <span>Exit to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Session PIN Banner */}
      <div
        className="enterprise-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          padding: '16px 24px',
          marginBottom: 24,
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            QUIZ: {session.quiz_title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.12em', color: '#38BDF8' }}>
              {session.session_code}
            </span>
            <button onClick={copyJoinLink} className="btn-outline btn-sm">
              {copied ? <Check size={14} color="#34D399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 600 }}>
            <Users size={18} color="#38BDF8" />
            <span>{totalCount} Joined</span>
          </div>

          {status === 'active' && (
            <button onClick={handleEndSession} className="btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StopCircle size={15} />
              <span>End Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* PHASE 1: LOBBY / WAITING FOR TRAINER TO START */}
      {status === 'waiting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="enterprise-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 8 }}>
              Waiting for Participants to Join
            </h2>
            <p style={{ color: '#94A3B8', maxWidth: 500, margin: '0 auto 20px', fontSize: '0.95rem' }}>
              Instruct participants to go to <strong>{window.location.host}/join</strong> and enter code <strong style={{ color: '#38BDF8' }}>{session.session_code}</strong>.
            </p>

            {/* PIN & QR Display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                backgroundColor: '#0B1120',
                padding: '20px 24px',
                borderRadius: 12,
                border: '1px solid #1E293B',
                maxWidth: 480,
                margin: '0 auto 28px'
              }}
            >
              {showQr && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/join?code=${session.session_code}`)}`}
                  alt="Scan to join"
                  width={120}
                  height={120}
                  style={{ borderRadius: 8 }}
                />
              )}
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                  GAME PIN
                </span>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38BDF8', letterSpacing: '0.1em', lineHeight: 1 }}>
                  {session.session_code}
                </div>
              </div>
            </div>

            <button
              onClick={handleStartSession}
              disabled={totalCount === 0}
              className="btn-primary"
              style={{ padding: '14px 36px', fontSize: '1.1rem', fontWeight: 800 }}
            >
              <Play size={20} fill="currentColor" />
              <span>Start Quiz ({totalCount} Joined)</span>
            </button>
          </div>

          {/* Joined Participants Lobby */}
          <div className="enterprise-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>
              Joined Participants ({participants.length})
            </h3>
            {participants.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>No participants have joined yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {participants.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34D399' }} />
                    <span style={{ color: '#F8FAFC' }}>{p.display_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE LIVE MONITORING (INDEPENDENT PARTICIPANT PROGRESSION) */}
      {status === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Live Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
            <div className="enterprise-card" style={{ padding: '20px', backgroundColor: '#0F172A', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Participants
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F8FAFC', marginTop: 4 }}>
                {totalCount}
              </div>
            </div>

            <div className="enterprise-card" style={{ padding: '20px', backgroundColor: '#0F172A', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '0.78rem', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 700 }}>
                Currently Answering
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38BDF8', marginTop: 4 }}>
                {answeringCount}
              </div>
            </div>

            <div className="enterprise-card" style={{ padding: '20px', backgroundColor: '#0F172A', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '0.78rem', color: '#34D399', textTransform: 'uppercase', fontWeight: 700 }}>
                Completed
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34D399', marginTop: 4 }}>
                {completedCount}
              </div>
            </div>

            <div className="enterprise-card" style={{ padding: '20px', backgroundColor: '#0F172A', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '0.78rem', color: '#FBBF24', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Questions
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FBBF24', marginTop: 4 }}>
                {session.total_questions || 0}
              </div>
            </div>
          </div>

          {/* Live Ranking & Progress Table */}
          <div className="enterprise-card" style={{ padding: '24px', backgroundColor: '#0F172A', border: '1px solid #1E293B' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>
                  LIVE RANKING
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                  Participants progress at their own pace. Rankings update automatically in real time.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#34D399', fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34D399', animation: 'pulse 1.5s infinite' }} />
                <span>Live Feed Active</span>
              </div>
            </div>

            {participants.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>No participants currently in session.</p>
            ) : (
              <div className="table-responsive-wrapper">
                <table style={{ minWidth: 560, width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 14px' }}>Rank</th>
                      <th style={{ padding: '12px 14px' }}>Participant</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px' }}>Progress</th>
                      <th style={{ padding: '12px 14px' }}>Accuracy</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, idx) => {
                      const isCompleted = p.status === 'completed';
                      const qIndex = (p.current_question_index ?? 0) + 1;
                      const totalQ = session.total_questions || 1;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: '1px solid #1E293B',
                            backgroundColor: idx === 0 && (p.final_score || 0) > 0 ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          <td style={{ padding: '14px', fontWeight: 800, color: idx < 3 ? '#FBBF24' : '#94A3B8', fontSize: '1rem' }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '14px', fontWeight: 700, color: '#F8FAFC' }}>
                            {p.display_name}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {isCompleted ? (
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 9999,
                                  backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                  color: '#34D399',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <CheckCircle2 size={12} />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 9999,
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38BDF8',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Clock size={12} />
                                <span>Answering</span>
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.88rem', color: '#94A3B8' }}>
                            {isCompleted ? (
                              <span style={{ color: '#34D399', fontWeight: 700 }}>Finished ({totalQ}/{totalQ})</span>
                            ) : (
                              <span>Question {qIndex} of {totalQ}</span>
                            )}
                          </td>
                          <td style={{ padding: '14px', fontSize: '0.88rem', fontWeight: 700, color: p.final_percentage > 0 ? '#34D399' : '#94A3B8' }}>
                            {p.final_percentage ? `${p.final_percentage}%` : '-'}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', fontWeight: 900, color: '#FBBF24', fontSize: '1.1rem' }}>
                            {p.final_score || 0} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHASE 3: COMPLETED */}
      {status === 'completed' && (
        <div className="enterprise-card" style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px', backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Trophy size={56} color="#FBBF24" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F8FAFC', marginBottom: 8 }}>
              Quiz Concluded!
            </h2>
            <p style={{ color: '#94A3B8', margin: '0 auto', fontSize: '0.95rem' }}>
              Final participant rankings and performance summary.
            </p>
          </div>

          {/* Simple Final Ranking Table */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
              Final Rankings
            </h3>
            {participants.length === 0 ? (
              <p style={{ color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>No participants joined this session.</p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #1E293B', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px', width: 80 }}>Rank</th>
                      <th style={{ padding: '12px 16px' }}>Participant</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...participants]
                      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
                      .map((p, idx) => (
                        <tr
                          key={p.id || idx}
                          style={{
                            borderBottom: '1px solid #1E293B',
                            backgroundColor: idx === 0 ? 'rgba(251, 191, 36, 0.08)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: idx === 0 ? '#FBBF24' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : '#64748B' }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#F8FAFC' }}>
                            {p.display_name}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: '#38BDF8', fontSize: '1.05rem' }}>
                            {p.final_score || 0} pts
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Quiz Insights Card (Fact vs Interpretation) */}
          <div style={{
            backgroundColor: '#0B1120',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 20,
            marginBottom: 28,
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(20, 184, 166, 0.15)',
                  color: 'var(--color-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC' }}>
                    AI Quiz Insights & Cohort Diagnostics
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    Separating empirical session facts from pedagogical interpretations
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-teal" style={{ fontSize: '0.68rem' }}>qwen3:8b</span>
                <button
                  type="button"
                  onClick={fetchInsights}
                  disabled={insightsLoading}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Regenerate insights"
                >
                  <RefreshCw size={12} className={insightsLoading ? 'spin' : ''} />
                  <span>{insightsLoading ? 'Analyzing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {insightsLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div className="spinner" style={{ width: 28, height: 28, border: '3px solid rgba(20, 184, 166, 0.3)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Analyzing participant response patterns with local AI...</span>
              </div>
            ) : insightsError ? (
              <div style={{ padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid #EF4444', borderRadius: 8, color: '#FCA5A5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{insightsError}</span>
                <button type="button" onClick={fetchInsights} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem' }}>Retry</button>
              </div>
            ) : insightsData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Executive Summary */}
                {insightsData.executive_summary && (
                  <div style={{
                    backgroundColor: '#1E293B',
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    color: '#F1F5F9',
                    borderLeft: '3px solid var(--color-teal)'
                  }}>
                    {insightsData.executive_summary}
                  </div>
                )}

                {/* FACTS vs INTERPRETATION Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
                  {/* Empirical Facts Panel */}
                  <div style={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #10B981',
                    borderRadius: 8,
                    padding: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        FACT (Empirical Data)
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(insightsData.factual_summary || []).map((f, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: '#E2E8F0', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 }}>
                          <span style={{ color: '#10B981', fontWeight: 800 }}>&bull;</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Interpretations Panel */}
                  <div style={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #8B5CF6',
                    borderRadius: 8,
                    padding: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', border: '1px solid #8B5CF6', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        INTERPRETATION (Pedagogical Hypotheses)
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(insightsData.interpretations || []).slice(0, 2).map((item, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 700, color: '#A78BFA' }}>
                            Q{item.question_number}: {item.learner_misconception}
                          </div>
                          {item.pedagogical_insight && (
                            <div style={{ color: '#94A3B8', marginTop: 2, fontStyle: 'italic' }}>
                              Tip: {item.pedagogical_insight}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {insightsData.recommendations?.length > 0 && (
                  <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Trainer Action Items
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {insightsData.recommendations.map((rec, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: '#FEF3C7', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#F59E0B' }}>&bull;</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal trigger */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setInsightsModalOpen(true)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', color: '#38BDF8', borderColor: '#0284C7' }}
                  >
                    <span>View Deep Pedagogical Breakdown</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <button
                  type="button"
                  onClick={fetchInsights}
                  className="btn btn-teal btn-sm"
                >
                  <Sparkles size={14} />
                  <span>Generate AI Quiz Insights</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(`/reports?session_id=${sessionId}`)}
              className="btn-primary btn-lg"
            >
              <BarChart2 size={18} />
              <span>View Full Analytics</span>
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-outline btn-lg">
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Modal: Full AI Insights & Metric Breakdown */}
      <Modal
        isOpen={insightsModalOpen}
        onClose={() => setInsightsModalOpen(false)}
        title="📊 AI Quiz Insights & Question Analytics"
        maxWidth={840}
      >
        {insightsData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ backgroundColor: '#0F172A', padding: 14, borderRadius: 8, border: '1px solid #334155' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                {insightsData.quiz_title}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                Cohort Performance: {insightsData.overall_accuracy}% accuracy across {insightsData.total_participants} participant(s).
              </p>
            </div>

            {/* Question by question metric breakdown */}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', marginBottom: 8 }}>
                Question Breakdown & Distractor Pull
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(insightsData.question_breakdowns || []).map((q) => (
                  <div key={q.question_id} style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#F8FAFC' }}>
                        Q{q.question_number}: {q.question_text}
                      </span>
                      <span className={`badge ${q.accuracy >= 70 ? 'badge-success' : q.accuracy >= 50 ? 'badge-gold' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                        {q.accuracy}% Acc
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                      Correct: {q.correct_count}/{q.total_answered} &bull; Avg Response: {q.avg_response_time}s &bull; Correct Answer: <span style={{ color: '#34D399' }}>{q.correct_answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setInsightsModalOpen(false)}
                className="btn btn-teal"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

