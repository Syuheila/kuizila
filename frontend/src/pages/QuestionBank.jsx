import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Database,
  Search,
  Plus,
  Play,
  Swords,
  Edit3,
  Eye,
  Trash2,
  FolderOpen,
  LayoutGrid,
  List,
  Clock,
  CheckCircle2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import Modal from '../components/Modal';
import QuestionPreview from '../components/QuestionPreview';
import BattleSettingsModal from '../components/BattleSettingsModal';
import { api } from '../services/api';

export default function QuestionBank() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [battleQuiz, setBattleQuiz] = useState(null);

  useEffect(() => {
    loadQuizzes();
  }, [search]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      const data = await api.getQuizzes(params);
      setQuizzes(data || []);
    } catch (err) {
      console.error('Failed to load quiz packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async (quiz) => {
    try {
      const session = await api.createSession(quiz.id);
      navigate(`/live/host/${session.id}`);
    } catch (err) {
      alert(`Could not start live session: ${err.message}`);
    }
  };

  const handleDelete = async (quiz) => {
    if (!window.confirm(`Delete quiz package "${quiz.title}"?`)) return;
    try {
      await api.deleteQuiz(quiz.id);
      loadQuizzes();
    } catch (err) {
      alert(`Could not delete quiz: ${err.message}`);
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

  const filtered = quizzes.filter((q) => {
    if (categoryFilter === 'All') return true;
    return q.category?.toLowerCase() === categoryFilter.toLowerCase();
  });

  const categories = ['All', ...Array.from(new Set(quizzes.map((q) => q.category).filter(Boolean)))];

  return (
    <div style={{ width: '100%' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', margin: '0 0 4px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={22} color="#06B6D4" />
            <span>Question Bank & Content Packages</span>
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
            Reusable quiz packages and permanent question modules. Create once, reuse indefinitely across all live sessions and battles.
          </p>
        </div>

        <Link to="/creator" className="btn-primary">
          <Plus size={16} />
          <span>New Quiz Package</span>
        </Link>
      </div>

      {/* Search, Categories & View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search quiz packages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1E293B', padding: '3px', borderRadius: '6px', border: '1px solid #334155' }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: viewMode === 'grid' ? '#06B6D4' : 'transparent',
              color: viewMode === 'grid' ? '#FFFFFF' : '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
            title="Card Grid View"
          >
            <LayoutGrid size={15} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: viewMode === 'table' ? '#06B6D4' : 'transparent',
              color: viewMode === 'table' ? '#FFFFFF' : '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
            title="Table List View"
          >
            <List size={15} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filtered.length === 0 ? (
        <div
          className="enterprise-card"
          style={{
            textAlign: 'center',
            padding: '56px 20px',
            color: '#94A3B8'
          }}
        >
          <FolderOpen size={40} style={{ margin: '0 auto 12px', color: '#475569' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>
            No saved quiz packages in Question Bank
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '20px', maxWidth: '440px', margin: '0 auto 20px' }}>
            Create your first quiz package to save reusable questions permanently without expiration.
          </p>
          <Link to="/creator" className="btn-primary">
            <Plus size={16} />
            <span>Create Quiz Package</span>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        /* Reusable Package Cards */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '20px'
          }}
        >
          {filtered.map((quiz) => (
            <div
              key={quiz.id}
              className="enterprise-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid #334155',
                padding: '24px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)'
              }}
            >
              <div>
                {/* Header tags */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge-pill brand">{quiz.category || 'General'}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} color="#10B981" /> Permanent
                  </span>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
                  {quiz.title}
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {quiz.description || 'Reusable quiz content package.'}
                </p>

                {/* Package Meta Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '20px',
                  fontSize: '0.825rem',
                  color: '#CBD5E1'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#38BDF8' }}>
                    <HelpCircle size={15} />
                    <span>{quiz.question_count || (quiz.quiz_questions ? quiz.quiz_questions.length : 0)} Questions</span>
                  </span>
                  <span style={{ color: '#64748B' }}>•</span>
                  <span style={{ color: '#94A3B8' }}>
                    Created: {quiz.created_at ? quiz.created_at.split('T')[0] : 'Recently'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: [Open] [Launch Live] [Battle] [Edit] [Delete] */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                <button
                  type="button"
                  onClick={() => handleOpenPreview(quiz)}
                  className="btn-outline btn-sm"
                  style={{ flex: 1, minWidth: '75px', justifyContent: 'center' }}
                  title="Open and preview all questions"
                >
                  <Eye size={14} />
                  <span>Open</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartLive(quiz)}
                  className="btn-primary btn-sm"
                  style={{ flex: 1, minWidth: '85px', justifyContent: 'center' }}
                  title="Launch Live Session"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Launch</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBattleQuiz(quiz)}
                  className="btn-outline btn-sm"
                  style={{ flex: 1, minWidth: '75px', borderColor: '#A855F7', color: '#C084FC', justifyContent: 'center' }}
                  title="Start Battle Mode"
                >
                  <Swords size={14} />
                  <span>Battle</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/creator?edit=${quiz.id}`)}
                  className="btn-outline btn-sm"
                  style={{ padding: '6px 10px' }}
                  title="Edit Quiz"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(quiz)}
                  className="btn-outline btn-sm"
                  style={{ padding: '6px 10px', color: 'var(--color-danger)' }}
                  title="Delete Quiz"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Reusable Package Table View */
        <div className="enterprise-table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Quiz Package</th>
                <th>Category</th>
                <th>Questions</th>
                <th>Created</th>
                <th>Sessions Used</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quiz) => (
                <tr key={quiz.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{quiz.title}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {quiz.description?.slice(0, 70)}...
                    </span>
                  </td>
                  <td>
                    <span className="badge-pill brand">{quiz.category}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#38BDF8' }}>
                      {quiz.question_count || 0} Questions
                    </span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {quiz.created_at ? quiz.created_at.split('T')[0] : 'Recently'}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-muted)' }}>{quiz.usage_count || 0} times</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => handleOpenPreview(quiz)}
                        title="Open and preview questions"
                      >
                        <Eye size={12} />
                        <span>Open</span>
                      </button>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => handleStartLive(quiz)}
                        title="Start live quiz"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Launch</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => setBattleQuiz(quiz)}
                        style={{ borderColor: '#A855F7', color: '#C084FC' }}
                        title="Start battle mode"
                      >
                        <Swords size={12} />
                        <span>Battle</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => navigate(`/creator?edit=${quiz.id}`)}
                        title="Edit quiz"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => handleDelete(quiz)}
                        style={{ color: 'var(--color-danger)' }}
                        title="Delete quiz"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
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

      {/* Battle Settings Modal */}
      {battleQuiz && (
        <BattleSettingsModal
          isOpen={true}
          quiz={battleQuiz}
          onClose={() => setBattleQuiz(null)}
        />
      )}
    </div>
  );
}
