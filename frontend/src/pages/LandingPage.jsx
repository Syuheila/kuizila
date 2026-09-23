import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  BarChart3,
  Sparkles,
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
  Layers,
  ChevronRight,
  Check
} from 'lucide-react';
import LoomiLogo from '../components/LoomiLogo';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [validatingPin, setValidatingPin] = useState(false);

  const { user: currentUser } = useAuth();

  const handleQuickJoin = async (e) => {
    e.preventDefault();
    setCodeError('');
    const clean = gameCode.trim().toUpperCase();
    if (!clean || clean.length < 4) {
      setCodeError('Enter a valid 4 to 8-character game PIN');
      return;
    }
    setValidatingPin(true);
    try {
      const res = await api.validateSessionCode(clean);
      if (res && res.valid) {
        navigate(`/join?code=${clean}`);
      } else {
        setCodeError(res?.message || 'Quiz session not found or has concluded. Please check the PIN.');
      }
    } catch (err) {
      setCodeError('Unable to verify game PIN. Please check your connection or PIN.');
    } finally {
      setValidatingPin(false);
    }
  };

  const handleCreateQuizClick = () => {
    if (currentUser) {
      navigate('/creator');
    } else {
      navigate('/login?redirect=/creator');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B1120', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '72px',
          borderBottom: '1px solid #1E293B',
          backgroundColor: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <LoomiLogo to="/" size="md" />
          <nav className="landing-nav" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#capabilities" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94A3B8' }}>
              Capabilities
            </a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/login" className="btn-outline btn-sm">
            Trainer Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '48px 16px 36px', maxWidth: '1160px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 36px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 9999,
              backgroundColor: 'rgba(20, 184, 166, 0.12)',
              border: '1px solid rgba(20, 184, 166, 0.35)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#2DD4BF',
              marginBottom: 16
            }}
          >
            <Sparkles size={14} />
            <span>Trainer-Led Interactive Quiz & Response Collection Platform</span>
          </div>

          <h1 className="hero-title" style={{ fontWeight: 800, lineHeight: 1.25, color: '#F8FAFC', marginBottom: 16 }}>
            Interactive Quizzes & Real-Time Response Collection for Workshops
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
            Engage every participant in your training sessions, classes, and corporate workshops with synchronized countdowns, live response tracking, and deep topic mastery analytics.
          </p>
        </div>

        {/* Primary Dual Actions: JOIN A QUIZ & CREATE A QUIZ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, marginBottom: 48 }}>
          {/* Action 1: JOIN A QUIZ */}
          <div
            style={{
              backgroundColor: '#1E293B',
              border: '1.5px solid #334155',
              borderRadius: 16,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: 'rgba(20, 184, 166, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#14B8A6'
                }}>
                  <Play size={20} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Join a Live Quiz
                </h2>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: 20 }}>
                Participating in a workshop or class? Enter your game PIN to answer questions and view instant results. <strong>No account or login required.</strong>
              </p>

              <form onSubmit={handleQuickJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <input
                    type="text"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    placeholder="ENTER 6-DIGIT GAME PIN"
                    maxLength={8}
                    style={{
                      backgroundColor: '#0F172A',
                      border: codeError ? '1px solid #EF4444' : '1px solid #334155',
                      borderRadius: 10,
                      padding: '14px 16px',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textAlign: 'center',
                      color: '#F8FAFC',
                      width: '100%'
                    }}
                  />
                  {codeError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontSize: '0.8rem', marginTop: 6 }}>
                      <AlertCircle size={14} />
                      <span>{codeError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={validatingPin}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    justifyContent: 'center'
                  }}
                >
                  <Play size={16} />
                  <span>{validatingPin ? 'Verifying PIN...' : 'Join Game Now'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Action 2: CREATE A QUIZ */}
          <div
            style={{
              backgroundColor: '#1E293B',
              border: '1.5px solid #334155',
              borderRadius: 16,
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#06B6D4'
                }}>
                  <Sparkles size={20} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                  Create & Host Quizzes
                </h2>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: 20 }}>
                Lead high-impact workshops. Create reusable quizzes manually, generate with private AI, or extract directly from training slides and documents.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleCreateQuizClick}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0F766E 0%, #06B6D4 100%)'
                  }}
                >
                  <Sparkles size={16} />
                  <span>Create a Quiz</span>
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    to="/login?redirect=/creator"
                    className="btn-outline"
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem', justifyContent: 'center' }}
                  >
                    Trainer Sign In
                  </Link>
                  <Link
                    to="/signup?redirect=/creator"
                    className="btn-outline"
                    style={{ flex: 1, padding: '10px', fontSize: '0.85rem', justifyContent: 'center' }}
                  >
                    Register Free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: 6 Core Platform Capabilities */}
        <div id="capabilities" style={{ paddingTop: 20, marginBottom: 56 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 8 }}>
              Built for Modern Trainers & Facilitators
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#94A3B8', margin: 0 }}>
              Everything needed to prepare, host, and analyze interactive sessions without friction.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
            {/* Capability 1: Manual Question Creator */}
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(20, 184, 166, 0.15)', color: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                1. Manual Question Creator
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Full-featured editor supporting multiple-choice, true/false, multi-select, and polls. Configure custom time limits, point weights, and explanations for post-answer review.
              </p>
            </div>

            {/* Capability 2: AI Question Generation */}
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                2. AI Question Generation
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Synthesize high-quality questions on any topic in seconds. Choose exact question counts and review before saving.
              </p>
            </div>

            {/* Capability 3: Document Upload (PDF, PPTX, DOCX) */}
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                3. Training Materials Upload
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Upload workshop slides, handouts, and guides (PDF, PPTX, DOCX, TXT). Loomi extracts core concepts and generates targeted assessment questions automatically.
              </p>
            </div>

            {/* Capability 4: Synchronized Live Hosting */}
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                4. Synchronized Live Hosting
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Authoritative server timing prevents drift across devices. Live response counters show how many participants have submitted before advancing.
              </p>
            </div>

            {/* Capability 5: Real Response Collection */}
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                5. Granular Response Collection
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Every single participant answer, response time, point value, and correctness is permanently recorded in the database for transparent reporting.
              </p>
            </div>

            {/* Capability 6: Workshop Analytics & Topic Mastery */}
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                6. Workshop Analytics
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Instantly view which questions participants mastered vs. struggled with. Drill into option distributions, average response times, and export full reports to CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid #1E293B',
          backgroundColor: '#0F172A',
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#64748B'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <LoomiLogo to="/" size="sm" />
          <span>• Interactive Quiz & Response Collection Platform</span>
        </div>
        <div>
          Designed for trainers, instructors, and facilitators.
        </div>
      </footer>
    </div>
  );
}
