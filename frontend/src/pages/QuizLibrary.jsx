import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Play,
  Copy,
  Edit3,
  Eye,
  Trash2,
  FolderOpen,
  LayoutGrid,
  List,
  FileDown,
  Download,
  AlertCircle
} from 'lucide-react';
import Modal from '../components/Modal';
import QuestionPreview from '../components/QuestionPreview';
import QuizCard from '../components/QuizCard';
import { api } from '../services/api';

export default function QuizLibrary() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // PDF Export Modal State
  const [exportModalQuiz, setExportModalQuiz] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

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
      console.error('Failed to load quizzes:', err);
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

  const handleOpenPreview = async (quiz) => {
    try {
      const full = await api.getQuiz(quiz.id);
      setPreviewQuiz(full);
      setPreviewIndex(0);
    } catch (err) {
      alert(`Could not load preview: ${err.message}`);
    }
  };

  const handleDuplicate = async (quiz) => {
    try {
      await api.duplicateQuiz(quiz.id);
      loadQuizzes();
    } catch (err) {
      alert(`Could not duplicate quiz: ${err.message}`);
    }
  };

  const handleDelete = async (quiz) => {
    if (!window.confirm(`Are you sure you want to delete "${quiz.title}"?`)) return;
    try {
      await api.deleteQuiz(quiz.id);
      loadQuizzes();
    } catch (err) {
      alert(`Could not delete quiz: ${err.message}`);
    }
  };

  const handleExecuteExport = async (quiz, includeAnswers) => {
    try {
      setExportingPdf(true);
      setExportError('');
      const clean = (quiz.title || 'quiz').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 35);
      const filename = includeAnswers ? `loomi_${clean}_answer_key.pdf` : `loomi_${clean}_quiz.pdf`;
      await api.exportQuizPDF(quiz.id, includeAnswers, filename);
      setExportModalQuiz(null);
    } catch (err) {
      console.error('Export error:', err);
      setExportError(err.message || 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const filtered = quizzes.filter((q) => {
    if (statusFilter === 'All') return true;
    return q.status === statusFilter.toLowerCase();
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
            Quiz Library
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: '4px 0 0' }}>
            Manage and launch your quizzes for live sessions
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/creator" className="btn-primary">
            <Plus size={16} />
            <span>Create Quiz</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="enterprise-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <Search size={16} className="input-icon" color="#94A3B8" />
            <input
              type="text"
              placeholder="Search quizzes by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', width: 140, padding: '8px 12px', borderRadius: 8 }}
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 4, backgroundColor: '#1E293B', padding: 3, borderRadius: 6, border: '1px solid #334155' }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: viewMode === 'grid' ? '#06B6D4' : 'transparent',
              color: viewMode === 'grid' ? '#FFFFFF' : '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: viewMode === 'table' ? '#06B6D4' : 'transparent',
              color: viewMode === 'table' ? '#FFFFFF' : '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Quizzes View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>Loading quizzes...</div>
      ) : filtered.length === 0 ? (
        <div className="enterprise-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <FolderOpen size={48} style={{ margin: '0 auto 12px', color: '#475569' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC', marginBottom: 6 }}>
            {search ? 'No quizzes found' : 'No quizzes yet'}
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: 20 }}>
            {search ? 'Try adjusting your search query' : 'Create your first quiz to get started'}
          </p>
          <Link to="/creator" className="btn-primary">
            <Plus size={16} />
            <span>Create Quiz</span>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
          {filtered.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onStartLive={handleStartLive}
              onEdit={(q) => navigate(`/quizzes/${q.id}`)}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onPreview={handleOpenPreview}
              onExportPdf={(q) => {
                setExportModalQuiz(q);
                setExportError('');
              }}
            />
          ))}
        </div>
      ) : (
        <div className="enterprise-card table-responsive-wrapper" style={{ padding: 0 }}>
          <table style={{ minWidth: 640, width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Title</th>
                <th style={{ padding: '14px 20px' }}>Category</th>
                <th style={{ padding: '14px 20px' }}>Questions</th>
                <th style={{ padding: '14px 20px' }}>Created</th>
                <th style={{ padding: '14px 20px' }}>Usage</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quiz) => (
                <tr key={quiz.id} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <Link to={`/quizzes/${quiz.id}`} style={{ fontWeight: 700, color: '#F8FAFC', textDecoration: 'none' }}>
                      {quiz.title}
                    </Link>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className="badge-pill brand" style={{ fontSize: '0.72rem' }}>{quiz.category || 'General'}</span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                    {quiz.question_count || (quiz.quiz_questions ? quiz.quiz_questions.length : 0)}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#94A3B8', fontSize: '0.85rem' }}>
                    {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{quiz.usage_count || 0} times</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <button onClick={() => handleStartLive(quiz)} className="btn-primary btn-sm" title="Host Live Quiz">
                        <Play size={14} fill="currentColor" />
                        <span>Live</span>
                      </button>
                      <button onClick={() => handleOpenPreview(quiz)} className="btn-outline btn-sm" title="Preview Quiz">
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => { setExportModalQuiz(quiz); setExportError(''); }}
                        className="btn-outline btn-sm"
                        title="Export Quiz as PDF"
                      >
                        <FileDown size={14} color="var(--color-teal)" />
                      </button>
                      <Link to={`/quizzes/${quiz.id}`} className="btn-outline btn-sm" title="Edit Quiz">
                        <Edit3 size={14} />
                      </Link>
                      <button onClick={() => handleDuplicate(quiz)} className="btn-outline btn-sm" title="Duplicate Quiz">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleDelete(quiz)} className="btn-outline btn-sm" style={{ color: '#EF4444' }} title="Delete Quiz">
                        <Trash2 size={14} />
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

      {/* Export PDF Modal */}
      {exportModalQuiz && (
        <Modal
          isOpen={true}
          title="Export Quiz as PDF"
          onClose={() => {
            if (!exportingPdf) {
              setExportModalQuiz(null);
              setExportError('');
            }
          }}
          maxWidth={500}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              Select the PDF version to download for <strong>"{exportModalQuiz.title}"</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                onClick={() => !exportingPdf && handleExecuteExport(exportModalQuiz, false)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: exportingPdf ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-teal)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                    1. Participant Quiz PDF (No Answers)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>
                    Clean printable paper test for trainees. Correct answers are hidden.
                  </div>
                </div>
                <button type="button" disabled={exportingPdf} className="btn btn-teal btn-sm" style={{ pointerEvents: 'none' }}>
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>

              <div
                onClick={() => !exportingPdf && handleExecuteExport(exportModalQuiz, true)}
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: exportingPdf ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-teal)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}>
                    2. Official Answer Key PDF (With Answers)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>
                    Trainer reference copy with correct answers highlighted and rationales.
                  </div>
                </div>
                <button type="button" disabled={exportingPdf} className="btn btn-outline btn-sm" style={{ pointerEvents: 'none' }}>
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {exportError && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                borderRadius: 6,
                color: '#FCA5A5',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <AlertCircle size={15} />
                <span>{exportError}</span>
              </div>
            )}

            {exportingPdf && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-teal)', fontSize: '0.85rem' }}>
                <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(20, 184, 166, 0.3)', borderTopColor: 'var(--color-teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>Generating and downloading PDF...</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setExportModalQuiz(null)}
                disabled={exportingPdf}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
