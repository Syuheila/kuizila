import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowRight
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
  const [transitionCountdown, setTransitionCountdown] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const questionStartClientRef = useRef(Date.now());
  const countdownIntervalRef = useRef(null);
  const submitPromiseRef = useRef(null);
  const latestSubmitResultRef = useRef(null);
  const isTransitioningRef = useRef(false);

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
        // Prevent background polling from overriding while user is actively in 3-second transition
        if (isTransitioningRef.current) {
          return prev;
        }
        // Prevent older polling data from resetting current question if participant is already ahead
        if (prev?.status === 'answering' && data.status === 'answering') {
          if (prev?.question?.question_id === data.question?.question_id) {
            return {
              ...data,
              question: prev.question
            };
          }
          if ((prev.current_question_index ?? 0) > (data.current_question_index ?? 0)) {
            return prev;
          }
        }
        if (prev?.question?.question_id !== data.question?.question_id) {
          setSelectedOption(null);
          setHasSubmitted(false);
          setTransitionCountdown(null);
          setAnswerFeedback(null);
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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const proceedToNext = (res) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setTransitionCountdown(null);
    setHasSubmitted(false);
    setSelectedOption(null);
    setAnswerFeedback(null);
    isTransitioningRef.current = false;

    if (!res) {
      loadParticipantState();
      return;
    }

    if (res.status === 'completed') {
      sound.playFanfare();
      sound.playLobbyMusic();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setState((prev) => ({
        ...prev,
        status: 'completed',
        session_id: prev?.session_id || state?.session_id,
        session_code: prev?.session_code || state?.session_code,
        quiz_title: prev?.quiz_title || state?.quiz_title,
        participant_id: participantId,
        display_name: displayName,
        final_score: res.total_score ?? prev?.final_score ?? currentScore,
        final_percentage: res.result?.final_percentage ?? (res.total_questions ? Math.round(((res.result?.correct_count ?? 0) / res.total_questions) * 100) : 100),
        final_rank: res.result?.final_rank ?? 1,
        correct_count: res.result?.correct_count ?? 0,
        total_questions: res.total_questions,
        review: res.result?.review || res.review || []
      }));
    } else if (res.next_question) {
      questionStartClientRef.current = Date.now();
      setState((prev) => ({
        ...prev,
        status: 'answering',
        score: res.total_score ?? prev?.score,
        streak: res.streak_count ?? prev?.streak,
        current_question_index: res.current_question_index,
        total_questions: res.total_questions,
        question: res.next_question,
        remaining_seconds: res.remaining_seconds
      }));
    } else {
      loadParticipantState();
    }
  };

  const submitAnswerInternal = (selectedOpt, isTimeout = false) => {
    if (hasSubmitted || !state?.question) return;
    setHasSubmitted(true);
    isTransitioningRef.current = true;
    if (selectedOpt) setSelectedOption(selectedOpt);

    const delaySeconds = 3;
    setTransitionCountdown(delaySeconds);

    const responseTime = Math.max(0.1, (Date.now() - questionStartClientRef.current) / 1000);

    // Fire API submission concurrently in background
    latestSubmitResultRef.current = null;
    submitPromiseRef.current = api.submitAnswer(
      state.session_id,
      participantId,
      state.question.question_id,
      selectedOpt ? selectedOpt.id : null,
      responseTime
    ).then((res) => {
      latestSubmitResultRef.current = res;
      if (res.total_score !== undefined) setCurrentScore(res.total_score);
      if (res.streak_count !== undefined) setCurrentStreak(res.streak_count);

      // Trigger authoritative feedback state and audio cue
      if (res && res.is_correct !== undefined && res.is_correct !== null) {
        setAnswerFeedback({
          isCorrect: Boolean(res.is_correct),
          correctOptionId: res.correct_option_id != null ? String(res.correct_option_id) : null,
          correctAnswer: res.correct_answer != null ? String(res.correct_answer) : null,
          selectedOptionId: selectedOpt ? String(selectedOpt.id) : null,
          pointsEarned: res.points_earned || 0
        });

        if (res.is_correct) {
          sound.playCorrect();
        } else {
          sound.playIncorrect();
        }
      }

      return res;
    }).catch((err) => {
      console.error('Submit answer error:', err);
      return null;
    });

    // Start 3-second visual countdown immediately on click
    let remaining = delaySeconds;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(async () => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        let result = latestSubmitResultRef.current;
        if (!result && submitPromiseRef.current) {
          result = await submitPromiseRef.current;
        }
        proceedToNext(result);
      } else {
        setTransitionCountdown(remaining);
      }
    }, 1000);
  };

  const handleSkipTransition = async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    let result = latestSubmitResultRef.current;
    if (!result && submitPromiseRef.current) {
      result = await submitPromiseRef.current;
    }
    proceedToNext(result);
  };

  const handleSelectOption = (opt) => {
    if (hasSubmitted || state?.status !== 'answering') return;
    setSelectedOption(opt);
    submitAnswerInternal(opt, false);
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

  const isLastQuestion = currentQ
    ? ((currentQ.question_index ?? state.current_question_index) + 1) >= (currentQ.total_questions || state.total_questions)
    : false;

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
              initialSeconds={currentQ.remaining_seconds}
              onTimeUp={handleTimeUp}
              isPaused={hasSubmitted}
              isTimeBomb={true}
            />
          </div>

          {/* Question Text Card */}
          <div
            className="enterprise-card"
            style={{
              padding: '24px 22px',
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
              const isSelected = selectedOption?.id === opt.id || String(selectedOption?.id) === String(opt.id);

              let isUserCorrect = false;
              let isUserWrong = false;
              let isRevealedCorrect = false;

              if (answerFeedback) {
                const isThisOptionCorrect = Boolean(
                  (answerFeedback.correctOptionId != null && String(opt.id) === String(answerFeedback.correctOptionId)) ||
                  (answerFeedback.correctAnswer && String(opt.text).trim().toLowerCase() === String(answerFeedback.correctAnswer).trim().toLowerCase())
                );

                if (answerFeedback.isCorrect) {
                  if (isSelected) {
                    isUserCorrect = true;
                  }
                } else {
                  if (isSelected) {
                    isUserWrong = true;
                  } else if (isThisOptionCorrect) {
                    isRevealedCorrect = true;
                  }
                }
              }

              let btnBg = '#1E293B';
              let btnBorder = isSelected ? '#38BDF8' : '#334155';
              let btnColor = isSelected ? '#38BDF8' : '#F8FAFC';
              let badgeBg = isSelected ? '#38BDF8' : '#0F172A';
              let badgeColor = isSelected ? '#0F172A' : '#94A3B8';
              let btnBoxShadow = isSelected ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none';
              let rightIcon = isSelected ? <CheckCircle2 size={20} color="#38BDF8" style={{ flexShrink: 0 }} /> : null;

              if (isUserCorrect || isRevealedCorrect) {
                btnBg = 'rgba(16, 185, 129, 0.18)';
                btnBorder = '#10B981';
                btnColor = '#34D399';
                badgeBg = '#10B981';
                badgeColor = '#FFFFFF';
                btnBoxShadow = '0 0 16px rgba(16, 185, 129, 0.35)';
                rightIcon = <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0 }} />;
              } else if (isUserWrong) {
                btnBg = 'rgba(239, 68, 68, 0.18)';
                btnBorder = '#EF4444';
                btnColor = '#F87171';
                badgeBg = '#EF4444';
                badgeColor = '#FFFFFF';
                btnBoxShadow = '0 0 16px rgba(239, 68, 68, 0.35)';
                rightIcon = <XCircle size={22} color="#EF4444" style={{ flexShrink: 0 }} />;
              }

              const isHighlighted = isUserCorrect || isRevealedCorrect || isUserWrong;
              const optionOpacity = hasSubmitted && !isHighlighted && !isSelected ? 0.45 : 1;

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
                    padding: '16px 20px',
                    borderRadius: 12,
                    boxShadow: btnBoxShadow,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: optionOpacity
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
                  {rightIcon}
                </button>
              );
            })}
          </div>

          {/* Submission & 3-Second Transition Banner */}
          {hasSubmitted ? (
            <div
              style={{
                borderRadius: 14,
                padding: '16px 20px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `1.5px solid ${
                  answerFeedback?.isCorrect === true
                    ? 'rgba(16, 185, 129, 0.4)'
                    : answerFeedback?.isCorrect === false
                    ? 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(56, 189, 248, 0.35)'
                }`,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: answerFeedback?.isCorrect === true
                        ? 'rgba(16, 185, 129, 0.15)'
                        : answerFeedback?.isCorrect === false
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                      border: `1px solid ${
                        answerFeedback?.isCorrect === true
                          ? 'rgba(16, 185, 129, 0.4)'
                          : answerFeedback?.isCorrect === false
                          ? 'rgba(239, 68, 68, 0.4)'
                          : 'rgba(56, 189, 248, 0.3)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: answerFeedback?.isCorrect === true ? '#10B981' : answerFeedback?.isCorrect === false ? '#EF4444' : '#38BDF8',
                      flexShrink: 0
                    }}
                  >
                    {answerFeedback?.isCorrect === false ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      {answerFeedback?.isCorrect === true
                        ? (answerFeedback.pointsEarned ? `✓ Correct! +${answerFeedback.pointsEarned} pts` : `✓ Correct Answer!`)
                        : answerFeedback?.isCorrect === false
                        ? `✕ Incorrect Answer`
                        : `✓ Your Answer is Saved!`}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, marginTop: 2 }}>
                      {isLastQuestion
                        ? `Calculating final results in `
                        : `Next question starting in `}
                      <strong style={{
                        color: answerFeedback?.isCorrect === true ? '#10B981' : answerFeedback?.isCorrect === false ? '#EF4444' : '#38BDF8',
                        fontSize: '0.95rem'
                      }}>
                        {transitionCountdown !== null ? transitionCountdown : 3}s
                      </strong>
                      ...
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSkipTransition}
                  className="btn-primary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer'
                  }}
                >
                  <span>{isLastQuestion ? 'View Results' : 'Next Question'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* 3-second progress shrinking bar */}
              <div style={{ width: '100%', height: 4, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: answerFeedback?.isCorrect === true ? '#10B981' : answerFeedback?.isCorrect === false ? '#EF4444' : '#38BDF8',
                    width: '100%',
                    animation: 'feedbackShrink 3s linear forwards'
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: '#64748B', fontSize: '0.85rem' }}>
              Click an option above to answer
            </div>
          )}
        </div>
      )}

      {/* PHASE 3: COMPLETED FINAL SCORE & QUESTION REVIEW SCREEN */}
      {status === 'completed' && (
        <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Results Card */}
          <div
            className="enterprise-card"
            style={{
              textAlign: 'center',
              padding: '36px 24px',
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

            {/* Score Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div style={{ padding: '18px 14px', backgroundColor: '#1E293B', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  Total Score
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38BDF8' }}>
                  {state.correct_count ?? 0} / {state.total_questions ?? 0}
                </span>
              </div>

              <div style={{ padding: '18px 14px', backgroundColor: '#1E293B', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  Accuracy
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34D399' }}>
                  {Math.round(state.final_percentage ?? (state.total_questions ? ((state.correct_count ?? 0) / state.total_questions) * 100 : 0))}%
                </span>
              </div>

              <div style={{ padding: '18px 14px', backgroundColor: '#1E293B', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  Total Points
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FBBF24' }}>
                  {state.final_score ?? currentScore} pts
                </span>
              </div>

              <div style={{ padding: '18px 14px', backgroundColor: '#1E293B', borderRadius: 12, border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 700 }}>
                  Final Rank
                </span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F8FAFC' }}>
                  #{state.final_rank || 1}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/join"
                className="btn-primary"
                style={{ padding: '12px 28px', fontWeight: 700 }}
              >
                Join Another Quiz
              </Link>
            </div>
          </div>

          {/* Full Question Review & Correct Answers Section */}
          {state.review && state.review.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '0 4px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={20} color="#38BDF8" />
                  <span>Question Review & Correct Answers</span>
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '4px 0 0' }}>
                  Review your answers alongside the correct answers and key explanations below.
                </p>
              </div>

              {state.review.map((item, idx) => {
                const isCorrect = item.is_correct === true;
                return (
                  <div
                    key={item.question_id || idx}
                    className="enterprise-card"
                    style={{
                      padding: '20px 22px',
                      backgroundColor: '#0F172A',
                      border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                      borderLeft: `4px solid ${isCorrect ? '#10B981' : '#EF4444'}`,
                      borderRadius: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16
                    }}
                  >
                    {/* Question Header & Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Question {idx + 1}
                      </span>

                      {isCorrect ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontWeight: 700, fontSize: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <CheckCircle2 size={16} />
                          <span>Correct (+{item.points_earned || 0} pts)</span>
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171', fontWeight: 700, fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          <XCircle size={16} />
                          <span>{item.selected_answer === null ? 'Timed Out (0 pts)' : 'Incorrect (0 pts)'}</span>
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#F8FAFC', margin: 0, lineHeight: 1.45 }}>
                      {item.question_text}
                    </h3>

                    {/* Options Review */}
                    {item.options && item.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {item.options.map((opt, optIdx) => {
                          const isUserChoice = String(opt.id) === String(item.selected_answer);
                          const isCorrectChoice =
                            Boolean(opt.is_correct) ||
                            String(opt.id) === String(item.correct_option_id) ||
                            (item.correct_answer && (
                              String(opt.text).trim().toLowerCase() === String(item.correct_answer).trim().toLowerCase() ||
                              String(opt.id).trim().toLowerCase() === String(item.correct_answer).trim().toLowerCase()
                            ));

                          let optBg = '#1E293B';
                          let optBorder = '#334155';
                          let optColor = '#94A3B8';
                          let badgeEl = null;

                          if (isCorrectChoice && isUserChoice) {
                            optBg = 'rgba(16, 185, 129, 0.15)';
                            optBorder = '#10B981';
                            optColor = '#34D399';
                            badgeEl = (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34D399', fontWeight: 700, fontSize: '0.8rem', backgroundColor: 'rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: 6 }}>
                                <CheckCircle2 size={14} /> Your Answer (Correct)
                              </span>
                            );
                          } else if (isCorrectChoice) {
                            optBg = 'rgba(16, 185, 129, 0.12)';
                            optBorder = '#10B981';
                            optColor = '#34D399';
                            badgeEl = (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34D399', fontWeight: 700, fontSize: '0.8rem', backgroundColor: 'rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: 6 }}>
                                <CheckCircle2 size={14} /> Correct Answer
                              </span>
                            );
                          } else if (isUserChoice) {
                            optBg = 'rgba(239, 68, 68, 0.12)';
                            optBorder = '#EF4444';
                            optColor = '#F87171';
                            badgeEl = (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#F87171', fontWeight: 700, fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.25)', padding: '2px 8px', borderRadius: 6 }}>
                                <XCircle size={14} /> Your Answer
                              </span>
                            );
                          }

                          return (
                            <div
                              key={opt.id || optIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '12px 16px',
                                borderRadius: 10,
                                backgroundColor: optBg,
                                border: `1.5px solid ${optBorder}`,
                                color: optColor
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                <span
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: isCorrectChoice ? '#10B981' : isUserChoice ? '#EF4444' : '#0F172A',
                                    color: isCorrectChoice || isUserChoice ? '#FFFFFF' : '#94A3B8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    flexShrink: 0
                                  }}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '0.92rem', wordBreak: 'break-word' }}>
                                  {opt.text}
                                </span>
                              </div>
                              {badgeEl}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Timeout Notice if no answer was submitted */}
                    {item.selected_answer === null && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#F87171', fontSize: '0.85rem', fontWeight: 600 }}>
                        No answer was submitted before the time limit expired.
                      </div>
                    )}

                    {/* Explanation */}
                    {item.explanation && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          fontSize: '0.9rem',
                          lineHeight: 1.5,
                          color: '#E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#38BDF8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <Sparkles size={14} color="#38BDF8" />
                          <span>Explanation & Key Takeaway</span>
                        </div>
                        <p style={{ margin: 0 }}>{item.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
