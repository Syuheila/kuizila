import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FolderOpen,
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  Play,
  Sparkles,
  BarChart3,
  LayoutGrid,
  List,
  Eye,
  Radio,
  Clock
} from 'lucide-react';
import QuizCard from '../components/QuizCard';
import QuestionPreview from '../components/QuestionPreview';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Question preview state
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardData();
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Could not connect to backend server. Please verify the service is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async (quiz) => {
    try {
      const session = await api.createSession(quiz.id);
      navigate(`/live/host/${session.id}`);
    } catch (err) {
      alert(`Error creating session: ${err.message}`);
    }
  };

  const handleOpenPreview = async (quiz) => {
    try {
      const full = await api.getQuiz(quiz.id);
      setPreviewQuiz(full);
      setPreviewIndex(0);
    } catch (err) {
      alert(`Could not load preview: ${err.message}`);
    }
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Trainer';

  const kpis = data?.kpis || {
    total_quizzes: 0,
    total_participants: 0,
    average_accuracy: 0,
    completed_sessions: 0
  };

  const recentQuizzes = data?.recent_quizzes || [];
  const recentSessions = data?.recent_sessions || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        <div>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#38BDF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Trainer Hub
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: '4px 0 0' }}>
            {getTimeOfDayGreeting()}, {firstName}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/reports" className="btn-outline btn-sm">
            <BarChart3 size={15} />
            <span>View Results</span>
          </Link>

          <Link to="/creator" className="btn-primary btn-sm">
            <Sparkles size={15} />
            <span>Create Quiz</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="auth-alert error" style={{ marginBottom: '24px' }}>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        <div className="enterprise-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Quizzes
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}>
              <FolderOpen size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', marginTop: '10px' }}>
            {kpis.total_quizzes}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Ready to host live</span>
        </div>

        <div className="enterprise-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Participants
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(20, 184, 166, 0.12)', color: '#2DD4BF' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', marginTop: '10px' }}>
            {kpis.total_participants}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Participants joined</span>
        </div>

        <div className="enterprise-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Completed Sessions
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', marginTop: '10px' }}>
            {kpis.completed_sessions}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Live quiz events run</span>
        </div>

        <div className="enterprise-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Average Accuracy
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#FBBF24' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', marginTop: '10px' }}>
            {(kpis.average_accuracy ?? 0)}%
          </div>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Across all responses</span>
        </div>
      </div>

      {/* Main Section: Quizzes + Recent Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '24px' }}>
        {/* Saved Quizzes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Your Quizzes
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link to="/quizzes" style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: 600 }}>
                Manage All ({recentQuizzes.length}) →
              </Link>
            </div>
          </div>

          {recentQuizzes.length === 0 ? (
            <div className="enterprise-card" style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
              <FolderOpen size={40} style={{ margin: '0 auto 12px', color: '#475569' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>No quizzes yet</h3>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '16px' }}>
                Create your first quiz with AI or manually.
              </p>
              <Link to="/creator" className="btn-primary">
                <Plus size={16} />
                <span>Create Quiz</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
              {recentQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="enterprise-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '20px',
                    border: '1px solid #1E293B',
                    backgroundColor: '#0F172A'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge-pill brand" style={{ fontSize: '0.72rem' }}>
                        {quiz.category || 'General'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {quiz.questions_count || 0} questions
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
                      {quiz.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartLive(quiz)}
                      className="btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Start Live</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview(quiz)}
                      className="btn-outline btn-sm"
                      title="Preview Questions"
                    >
                      <Eye size={14} />
                    </button>

                    <Link
                      to={`/quizzes/${quiz.id}`}
                      className="btn-outline btn-sm"
                      title="Manage Quiz"
                    >
                      <span>Edit</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Recent Quiz Sessions
            </h2>
            <Link to="/reports" style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: 600 }}>
              All Reports →
            </Link>
          </div>

          <div className="enterprise-card" style={{ padding: '0', overflow: 'hidden' }}>
            {recentSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94A3B8' }}>
                <Clock size={36} style={{ margin: '0 auto 8px', color: '#475569' }} />
                <p style={{ margin: 0 }}>No sessions conducted yet.</p>
              </div>
            ) : (
              recentSessions.map((session, idx) => (
                <div
                  key={session.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: idx < recentSessions.length - 1 ? '1px solid #1E293B' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                        {session.session_code}
                      </span>
                      <span className="badge-pill brand" style={{ fontSize: '0.68rem' }}>
                        {session.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', marginTop: '2px' }}>
                      {session.quiz_title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      {session.participant_count} participants • {session.date}
                    </div>
                  </div>

                  <Link
                    to={`/reports?session_id=${session.id}`}
                    className="btn-outline btn-sm"
                  >
                    View Results
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Question Preview Modal */}
      {previewQuiz && (
        <Modal
          isOpen={true}
          title={`Preview: ${previewQuiz.title}`}
          onClose={() => setPreviewQuiz(null)}
        >
          <QuestionPreview
            quizQuestions={previewQuiz.quiz_questions || []}
            currentIndex={previewIndex}
            onSelectIndex={setPreviewIndex}
            onClose={() => setPreviewQuiz(null)}
          />
        </Modal>
      )}
    </div>
  );
}
