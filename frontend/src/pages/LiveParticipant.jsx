import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import Timer from '../components/Timer';
import LoomiLogo from '../components/LoomiLogo';
import { LoomiSocket } from '../services/websocket';
import { api } from '../services/api';
import { sound } from '../utils/sound';

export default function LiveParticipant() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const participantId = Number(
    searchParams.get('pid') || sessionStorage.getItem(`loomi_session_${code}_pid`)
  );
  const displayName =
    searchParams.get('name') ||
    sessionStorage.getItem(`loomi_session_${code}_name`) ||
    'Participant';

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Answering state
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const questionStartClientRef = useRef(Date.now());

  useEffect(() => {
    if (!participantId) {
      setError('Participant session not found. Please rejoin.');
      setLoading(false);
      return;
    }

    loadParticipantState();

    // Poll fallback every 2.5s
    const interval = setInterval(() => {
      loadParticipantState(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [participantId]);

  const loadParticipantState = async (silent = false) => {
    if (!participantId) return;
    try {
      const data = await api.getParticipantState(participantId);
      setState((prev) => {
        if (prev?.question?.question_id !== data.question?.question_id) {
          setSelectedOption(null);
          setHasSubmitted(false);
          setFeedback(null);
          questionStartClientRef.current = Date.now();
        }
        return data;
      });
      if (data.score !== undefined) setCurrentScore(data.score);
      if (data.streak !== undefined) setCurrentStreak(data.streak);
      if (data.final_score !== undefined) setCurrentScore(data.final_score);
    } catch (err) {
      console.error('Participant state fetch failed:', err);
      if (!silent) setError(err.message || 'Failed to connect to quiz room');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!code || !participantId) return;

    const socket = new LoomiSocket(code, 'participant', participantId, displayName, (event) => {
      console.log('[Participant WS]', event);
      if (event.event === 'SESSION_STARTED') {
        sound.playBattleStart();
        loadParticipantState();
      } else if (event.event === 'SESSION_COMPLETED') {
        loadParticipantState();
      }
    });

    socket.connect();
    return () => socket.disconnect();
  }, [code, participantId, displayName]);

  const handleSelectOption = (opt) => {
    if (hasSubmitted || state?.status !== 'answering') return;
    setSelectedOption(opt);
  };

  const submitAnswerInternal = async (selectedOpt, isTimeout = false) => {
    if (hasSubmitted || !state?.question) return;
    setHasSubmitted(true);

    const responseTime = Math.max(0.1, (Date.now() - questionStartClientRef.current) / 1000);

    try {
      const res = await api.submitAnswer(
        state.session_id,
        participantId,
        state.question.question_id,
        selectedOpt ? selectedOpt.id : null,
        responseTime
      );

      setFeedback({
        submitted: true,
        isTimeout: isTimeout
      });
      if (res.total_score !== undefined) setCurrentScore(res.total_score);
      if (res.streak_count !== undefined) setCurrentStreak(res.streak_count);

      // Automatically advance after brief 0.5s feedback flash
      setTimeout(() => {
        if (res.status === 'completed') {
          sound.playFanfare();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          setState({
            status: 'completed',
            session_id: state.session_id,
            session_code: state.session_code,
            quiz_title: state.quiz_title,
            participant_id: participantId,
            display_name: displayName,
            final_score: res.total_score,
            final_percentage: res.result?.final_percentage ?? 100,
            final_rank: res.result?.final_rank ?? 1,
            correct_count: res.result?.correct_count ?? 0,
            total_questions: res.total_questions
          });
        } else if (res.next_question) {
          setSelectedOption(null);
          setHasSubmitted(false);
          setFeedback(null);
          questionStartClientRef.current = Date.now();
          setState((prev) => ({
            ...prev,
            status: 'answering',
            score: res.total_score,
            streak: res.streak_count,
            current_question_index: res.current_question_index,
            total_questions: res.total_questions,
            question: res.next_question,
            remaining_seconds: res.remaining_seconds
          }));
        } else {
          loadParticipantState();
        }
      }, 500);
    } catch (err) {
      console.error('Submit answer error:', err);
      setHasSubmitted(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption) return;
    submitAnswerInternal(selectedOption, false);
  };

  const handleTimeUp = () => {
    if (hasSubmitted || state?.status !== 'answering') return;
    submitAnswerInternal(selectedOption, true);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        Connecting to quiz room...
      </div>
    );
  }

  if (error && !state) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="enterprise-card" style={{ maxWidth: 420, textAlign: 'center', padding: 32 }}>
          <AlertCircle size={40} color="#F87171" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: '#F8FAFC' }}>Quiz Error</h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: 20 }}>{error}</p>
          <Link to="/join" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Rejoin Quiz
          </Link>
        </div>
      </div>
    );
  }

  const status = state?.status || 'waiting';
  const currentQ = state?.question;

  const questionEndsAt = (currentQ?.question_started_at && currentQ?.time_limit)
    ? new Date(new Date(currentQ.question_started_at).getTime() + currentQ.time_limit * 1000).toISOString()
    : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B1120', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Top Participant Status Bar */}
      <header
        style={{
          padding: '12px 16px',
          backgroundColor: '#0F172A',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LoomiLogo to="/" size="sm" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em' }}>
            PIN: {code}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block' }}>Score</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FBBF24' }}>
              {currentScore} pts
            </span>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: '#F8FAFC'
            }}
          >
            {displayName}
          </div>
        </div>
      </header>

      {/* Feedback Flash Notification */}
      {feedback && (
        <div
          style={{
            backgroundColor: '#1E293B',
            color: '#F8FAFC',
            textAlign: 'center',
            padding: '10px 16px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderBottom: '1px solid #334155',
            transition: 'all 0.2s ease'
          }}
        >
          {feedback.isTimeout ? (
            <>
              <Clock size={18} color="#F59E0B" />
              <span>Time's up! Moving to next question...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} color="#38BDF8" />
              <span>Answer submitted</span>
            </>
          )}
        </div>
      )}

      {/* PHASE 1: WAITING ROOM */}
      {status === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div
            className="enterprise-card"
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              padding: '48px 28px',
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: 16
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Clock size={32} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 8 }}>
              You're in the Quiz!
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: 24 }}>
              Waiting for the trainer to start <strong>{state?.quiz_title || 'the quiz'}</strong>.
            </p>

            <div style={{ padding: '16px', backgroundColor: '#1E293B', borderRadius: 10, border: '1px solid #334155', display: 'inline-block', width: '100%', marginBottom: 20 }}>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Participant Name
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38BDF8' }}>
                {displayName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#34D399', fontSize: '0.85rem', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#34D399', animation: 'pulse 1.5s infinite' }} />
              <span>Ready — questions will start automatically</span>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE QUESTION (SELF-PACED INDEPENDENT FLOW) */}
      {status === 'answering' && currentQ && (
        <div style={{ flex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Progress & Individual Question Timer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question {(currentQ.question_index ?? state.current_question_index) + 1} of {currentQ.total_questions || state.total_questions}
            </span>

            <Timer
              duration={currentQ.time_limit || 30}
              endsAt={questionEndsAt}
              remainingSeconds={currentQ.remaining_seconds}
              serverTime={currentQ.server_time}
              onTimeUp={handleTimeUp}
            />
          </div>

          {/* Question Text Card */}
          <div
            className="enterprise-card"
            style={{
              padding: '22px 20px',
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: 14
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', margin: 0, lineHeight: 1.4 }}>
              {currentQ.question_text}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="participant-options-grid">
            {(currentQ.options || []).map((opt, idx) => {
              const isSelected = selectedOption?.id === opt.id;
              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => handleSelectOption(opt)}
                  className="participant-option-btn"
                  style={{
                    border: `2px solid ${isSelected ? '#38BDF8' : '#334155'}`,
                    backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#1E293B',
                    color: isSelected ? '#38BDF8' : '#F8FAFC',
                    cursor: hasSubmitted ? 'default' : 'pointer'
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#38BDF8' : '#0F172A',
                      color: isSelected ? '#0F172A' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ wordBreak: 'break-word', flex: 1 }}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Submit Action */}
          {!hasSubmitted ? (
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!selectedOption}
              className="btn-primary"
              style={{
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 800,
                width: '100%',
                marginTop: 8,
                opacity: selectedOption ? 1 : 0.6,
                cursor: selectedOption ? 'pointer' : 'not-allowed'
              }}
            >
              Submit Answer
            </button>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '14px',
                borderRadius: 10,
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38BDF8',
                fontWeight: 700,
                fontSize: '0.95rem'
              }}
            >
              ✓ Answer recorded! Moving to next question...
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: COMPLETED FINAL SCORE SCREEN */}
      {status === 'completed' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 14px' }}>
          <div
            className="enterprise-card"
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              padding: '36px 20px',
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: 16
            }}
          >
            <Trophy size={60} color="#FBBF24" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#F8FAFC', marginBottom: 6 }}>
              Quiz Complete!
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#94A3B8', marginBottom: 28 }}>
              Great job, {displayName}! You finished the quiz.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div style={{ padding: '20px 16px', backgroundColor: '#1E293B', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  Total Score
                </span>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#38BDF8' }}>
                  {state.correct_count ?? 0} / {state.total_questions ?? 0}
                </span>
              </div>

              <div style={{ padding: '20px 16px', backgroundColor: '#1E293B', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  Percentage
                </span>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#34D399' }}>
                  {Math.round(state.final_percentage ?? (state.total_questions ? ((state.correct_count ?? 0) / state.total_questions) * 100 : 0))}%
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 28, padding: '14px', backgroundColor: '#1E293B', borderRadius: 10, display: 'flex', justifyContent: 'space-around', alignItems: 'center', border: '1px solid #334155' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Points</span>
                <strong style={{ color: '#FBBF24', fontSize: '1.25rem' }}>
                  {state.final_score ?? currentScore} pts
                </strong>
              </div>
              <div style={{ width: 1, height: 24, backgroundColor: '#334155' }} />
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Final Rank</span>
                <strong style={{ color: '#F8FAFC', fontSize: '1.25rem' }}>
                  #{state.final_rank || 1}
                </strong>
              </div>
            </div>

            <Link
              to="/join"
              className="btn-primary"
              style={{ width: '100%', padding: '12px', justifyContent: 'center', fontWeight: 700 }}
            >
              Join Another Quiz
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
