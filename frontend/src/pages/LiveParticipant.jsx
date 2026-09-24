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
import SoundToggle from '../components/SoundToggle';
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
  const advanceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const latestSubmitResultRef = useRef(null);
  const [advanceCountdown, setAdvanceCountdown] = useState(null);

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
        sound.playLobbyMusic();
        loadParticipantState();
      }
    });

    socket.connect();
    return () => socket.disconnect();
  }, [code, participantId, displayName]);

  // Music Soundtrack Lifecycle: Lobby music while waiting and after finishing answering, continuous gameplay music while answering
  useEffect(() => {
    const status = state?.status;
    if (status === 'waiting') {
      sound.playLobbyMusic();
    } else if (status === 'answering') {
      sound.playGameplayMusic();
    } else if (status === 'completed') {
      sound.playLobbyMusic();
    }
  }, [state?.status]);

  useEffect(() => {
    return () => {
      sound.stopMusic();
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const proceedToNext = (res) => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAdvanceCountdown(null);

    if (!res) {
      loadParticipantState();
      return;
    }

    if (res.status === 'completed') {
      sound.playFanfare();
      sound.playLobbyMusic();
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
  };

  const submitAnswerInternal = async (selectedOpt, isTimeout = false) => {
    if (hasSubmitted || !state?.question) return;
    setHasSubmitted(true);
    if (selectedOpt) setSelectedOption(selectedOpt);

    const responseTime = Math.max(0.1, (Date.now() - questionStartClientRef.current) / 1000);

    try {
      const res = await api.submitAnswer(
        state.session_id,
        participantId,
        state.question.question_id,
        selectedOpt ? selectedOpt.id : null,
        responseTime
      );

      latestSubmitResultRef.current = res;
      const isCorrect = res.is_correct === true;
      if (isCorrect) {
        sound.playCorrect();
      } else {
        sound.playIncorrect();
      }

      if (res.total_score !== undefined) setCurrentScore(res.total_score);
      if (res.streak_count !== undefined) setCurrentStreak(res.streak_count);

      setFeedback({
        submitted: true,
        isTimeout: isTimeout,
        isCorrect: isCorrect,
        selectedOptId: selectedOpt ? selectedOpt.id : null,
        correctOptId: res.correct_option_id,
        correctAnswer: res.correct_answer,
        explanation: res.explanation,
        pointsEarned: res.points_earned || 0
      });

      // Allow comfortable reading time for explanation (6 seconds if explanation exists, 4.5 seconds otherwise)
      const delaySeconds = res.explanation ? 6 : 4.5;
      setAdvanceCountdown(Math.ceil(delaySeconds));

      let remaining = Math.ceil(delaySeconds);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setAdvanceCountdown(null);
        } else {
          setAdvanceCountdown(remaining);
        }
      }, 1000);

      advanceTimerRef.current = setTimeout(() => {
        proceedToNext(res);
      }, delaySeconds * 1000);
    } catch (err) {
      console.error('Submit answer error:', err);
      setHasSubmitted(false);
    }
  };

  const handleSelectOption = (opt) => {
    if (hasSubmitted || state?.status !== 'answering') return;
    setSelectedOption(opt);
    submitAnswerInternal(opt, false);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || hasSubmitted) return;
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
          <SoundToggle />
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
              key={currentQ.question_id || currentQ.question_index}
              duration={currentQ.time_limit || 30}
              endsAt={questionEndsAt}
              remainingSeconds={currentQ.remaining_seconds}
              serverTime={currentQ.server_time}
              onTimeUp={handleTimeUp}
              isPaused={hasSubmitted}
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
              const isWrongClicked = feedback && !feedback.isCorrect && (String(opt.id) === String(feedback.selectedOptId));
              const isRightAnswer = feedback && (
                String(opt.id) === String(feedback.correctOptId) ||
                (feedback.isCorrect && String(opt.id) === String(feedback.selectedOptId)) ||
                (feedback.correctAnswer && (
                  String(opt.text).trim().toLowerCase() === String(feedback.correctAnswer).trim().toLowerCase() ||
                  String(opt.id).trim().toLowerCase() === String(feedback.correctAnswer).trim().toLowerCase()
                ))
              );

              let btnBg = '#1E293B';
              let btnBorder = isSelected ? '#38BDF8' : '#334155';
              let btnColor = isSelected ? '#38BDF8' : '#F8FAFC';
              let badgeBg = isSelected ? '#38BDF8' : '#0F172A';
              let badgeColor = isSelected ? '#0F172A' : '#94A3B8';
              let statusBadge = null;

              if (feedback) {
                if (isRightAnswer) {
                  btnBg = 'rgba(16, 185, 129, 0.2)';
                  btnBorder = '#10B981';
                  btnColor = '#34D399';
                  badgeBg = '#10B981';
                  badgeColor = '#FFFFFF';
                  statusBadge = (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                      <CheckCircle2 size={22} color="#10B981" />
                      <span>Correct</span>
                    </span>
                  );
                } else if (isWrongClicked) {
                  btnBg = 'rgba(239, 68, 68, 0.2)';
                  btnBorder = '#EF4444';
                  btnColor = '#F87171';
                  badgeBg = '#EF4444';
                  badgeColor = '#FFFFFF';
                  statusBadge = (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F87171', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                      <XCircle size={22} color="#EF4444" />
                      <span>Wrong</span>
                    </span>
                  );
                } else {
                  btnBg = '#0F172A';
                  btnBorder = '#1E293B';
                  btnColor = '#64748B';
                  badgeBg = '#1E293B';
                  badgeColor = '#64748B';
                }
              } else if (isSelected) {
                btnBg = 'rgba(56, 189, 248, 0.15)';
                btnBorder = '#38BDF8';
                btnColor = '#38BDF8';
                badgeBg = '#38BDF8';
                badgeColor = '#0F172A';
              }

              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => handleSelectOption(opt)}
                  className="participant-option-btn"
                  style={{
                    border: `2px solid ${btnBorder}`,
                    backgroundColor: btnBg,
                    color: btnColor,
                    cursor: hasSubmitted ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 18px',
                    borderRadius: 12,
                    boxShadow: feedback && (isRightAnswer || isWrongClicked) ? (isRightAnswer ? '0 0 16px rgba(16, 185, 129, 0.25)' : '0 0 16px rgba(239, 68, 68, 0.25)') : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={{ wordBreak: 'break-word', fontWeight: 600, fontSize: '0.95rem', textAlign: 'left' }}>
                      {opt.text}
                    </span>
                  </div>
                  {statusBadge}
                </button>
              );
            })}
          </div>

          {/* Feedback & Advance Banner */}
          {feedback ? (
            <div
              style={{
                borderRadius: 12,
                padding: '18px 20px',
                backgroundColor: feedback.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${feedback.isCorrect ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {feedback.isCorrect ? (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
                      <CheckCircle2 size={26} />
                    </div>
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
                      <XCircle size={26} />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: feedback.isCorrect ? '#34D399' : '#F87171', margin: 0 }}>
                      {feedback.isCorrect ? 'Correct!' : 'Wrong Answer!'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, marginTop: 2 }}>
                      {feedback.isCorrect
                        ? `+${feedback.pointsEarned} points awarded!`
                        : feedback.correctAnswer
                          ? `The correct answer is: ${feedback.correctAnswer}`
                          : 'See the correct answer highlighted in green above'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => proceedToNext(latestSubmitResultRef.current)}
                  className="btn-primary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    gap: 6
                  }}
                >
                  <span>Next Question {advanceCountdown ? `(${advanceCountdown}s)` : ''}</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {feedback.explanation && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 10,
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    color: '#E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#38BDF8', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Sparkles size={15} color="#38BDF8" />
                    <span>Explanation & Key Takeaway</span>
                  </div>
                  <p style={{ margin: 0 }}>{feedback.explanation}</p>
                </div>
              )}

              {/* Countdown progress indicator */}
              <div style={{ width: '100%', height: 4, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: feedback.isCorrect ? '#10B981' : '#EF4444',
                    width: '100%',
                    animation: `feedbackShrink ${feedback.explanation ? 6 : 4.5}s linear forwards`
                  }}
                />
              </div>
            </div>
          ) : hasSubmitted ? (
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
              Checking answer...
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: '#64748B', fontSize: '0.85rem' }}>
              Click an option above to answer
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
