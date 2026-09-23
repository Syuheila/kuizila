import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Plus,
  Edit3,
  Trash2,
  Clock,
  HelpCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import Modal from '../components/Modal';
import AIGenerateModal from '../components/AIGenerateModal';
import { api } from '../services/api';

export default function QuizDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [addQuestionModalOpen, setAddQuestionModalOpen] = useState(false);

  // Manual Question Form State
  const [qType, setQType] = useState('multiple_choice');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState([
    { id: 'opt_1', text: '', is_correct: true },
    { id: 'opt_2', text: '', is_correct: false },
    { id: 'opt_3', text: '', is_correct: false },
    { id: 'opt_4', text: '', is_correct: false }
  ]);
  const [qExplanation, setQExplanation] = useState('');
  const [qTimeLimit, setQTimeLimit] = useState(30);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const data = await api.getQuiz(id);
      setQuiz(data);
    } catch (err) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async () => {
    try {
      const session = await api.createSession(quiz.id);
      navigate(`/live/host/${session.id}`);
    } catch (err) {
      alert(`Could not start session: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (linkId) => {
    if (!window.confirm('Remove this question from the quiz?')) return;
    try {
      await api.deleteQuizQuestion(quiz.id, linkId);
      loadQuiz();
    } catch (err) {
      alert(`Could not remove question: ${err.message}`);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!qText.trim()) {
      setFormError('Please enter question text');
      return;
    }
    const hasCorrect = qOptions.some((o) => o.is_correct && o.text.trim());
    if (!hasCorrect) {
      setFormError('Mark at least one option as correct and enter its text');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await api.addQuestionToQuiz(quiz.id, {
        question_text: qText.trim(),
        question_type: qType,
        options: qOptions.filter((o) => o.text.trim()),
        explanation: qExplanation.trim(),
        default_time_limit: qTimeLimit,
        default_points: 100
      });
      setAddQuestionModalOpen(false);
      setQText('');
      setQExplanation('');
      loadQuiz();
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8' }}>Loading quiz...</div>;
  }

  if (error || !quiz) {
    return (
      <div style={{ padding: '40px 32px' }}>
        <button onClick={() => navigate('/quizzes')} className="btn-outline btn-sm" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Back to Quizzes
        </button>
        <div className="auth-alert error">{error || 'Quiz not found'}</div>
      </div>
    );
  }

  const questions = quiz.quiz_questions || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/quizzes')} className="btn-outline btn-sm" style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to Quizzes
      </button>

      {/* Header Card */}
      <div className="enterprise-card" style={{ marginBottom: 24, padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="badge-pill brand">{quiz.category}</span>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{questions.length} Questions</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px' }}>
              {quiz.title}
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: 0, maxWidth: 650 }}>
              {quiz.description || 'No description provided.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleStartLive} className="btn-primary" style={{ padding: '10px 20px', fontWeight: 700 }}>
              <Play size={16} fill="currentColor" />
              <span>Start Live Quiz</span>
            </button>
            <button onClick={() => setAiModalOpen(true)} className="btn-outline">
              <Sparkles size={16} color="#38BDF8" />
              <span>AI Generate</span>
            </button>
            <button onClick={() => setAddQuestionModalOpen(true)} className="btn-outline">
              <Plus size={16} />
              <span>Add Question</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 8px' }}>
          Questions ({questions.length})
        </h2>

        {questions.length === 0 ? (
          <div className="enterprise-card" style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
            <p>No questions yet. Add questions manually or generate with AI.</p>
            <button onClick={() => setAiModalOpen(true)} className="btn-primary" style={{ marginTop: 12 }}>
              <Sparkles size={16} /> Generate with AI
            </button>
          </div>
        ) : (
          questions.map((qq, idx) => {
            const q = qq.question;
            return (
              <div key={qq.id} className="enterprise-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8' }}>
                        Question {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        ⏱ {qq.time_limit || 30}s
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 14 }}>
                      {q.question_text}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
                      {(q.options || []).map((opt, oIdx) => (
                        <div
                          key={opt.id || oIdx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.15)' : '#1E293B',
                            border: `1px solid ${opt.is_correct ? '#10B981' : '#334155'}`,
                            color: opt.is_correct ? '#34D399' : '#CBD5E1',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          {opt.is_correct && <CheckCircle2 size={14} color="#10B981" />}
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 12, fontStyle: 'italic' }}>
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(qq.id)}
                    className="btn-outline btn-sm"
                    style={{ color: '#EF4444' }}
                    title="Remove Question"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Add Question Modal */}
      {addQuestionModalOpen && (
        <Modal
          isOpen={addQuestionModalOpen}
          title="Add Multiple-Choice Question"
          onClose={() => setAddQuestionModalOpen(false)}
        >
          <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formError && <div className="auth-alert error">{formError}</div>}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 6 }}>
                Question Text *
              </label>
              <textarea
                rows={3}
                placeholder="Enter question text..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                required
                style={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', width: '100%', borderRadius: 8, padding: 10 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 8 }}>
                Options (Check the correct answer) *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qOptions.map((opt, idx) => (
                  <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="correct_option"
                      checked={opt.is_correct}
                      onChange={() => {
                        setQOptions((prev) =>
                          prev.map((o, i) => ({ ...o, is_correct: i === idx }))
                        );
                      }}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQOptions((prev) =>
                          prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                        );
                      }}
                      style={{ flex: 1, backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: 8, padding: '8px 12px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 6 }}>
                Explanation (Optional)
              </label>
              <input
                type="text"
                placeholder="Why is this correct?"
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                style={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', width: '100%', borderRadius: 8, padding: '8px 12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setAddQuestionModalOpen(false)} className="btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Adding...' : 'Add to Quiz'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Generate Modal */}
      {aiModalOpen && (
        <AIGenerateModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          quizId={quiz.id}
          onQuestionsAdded={() => {
            setAiModalOpen(false);
            loadQuiz();
          }}
        />
      )}
    </div>
  );
}
