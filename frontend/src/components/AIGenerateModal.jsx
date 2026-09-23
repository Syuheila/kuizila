import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Cpu,
  Layers
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

export default function AIGenerateModal({ isOpen, onClose, quizId, onQuestionsAdded }) {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'generating' | 'review'
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [customCount, setCustomCount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const resetState = () => {
    setStep('prompt');
    setTopic('');
    setNumQuestions(5);
    setCustomCount('');
    setIsCustom(false);
    setDifficulty('medium');
    setQuestionType('multiple_choice');
    setGeneratedQuestions([]);
    setErrorMessage('');
    setSaving(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setErrorMessage('Please enter a topic or learning objective.');
      return;
    }

    const count = isCustom ? (parseInt(customCount, 10) || 5) : numQuestions;
    if (count < 1 || count > 30) {
      setErrorMessage('Please choose a question count between 1 and 30.');
      return;
    }

    try {
      setStep('generating');
      setErrorMessage('');

      const response = await api.generateQuizAI({
        topic: topic.trim(),
        num_questions: count,
        difficulty: difficulty,
        question_type: questionType
      });

      const questionsList = (response?.questions || []).map((q, idx) => ({
        id: `gen_ai_${Date.now()}_${idx}`,
        question_type: q.question_type || 'multiple_choice',
        question_text: q.question_text || '',
        options: (q.options || []).map((opt, optIdx) => ({
          id: opt.id || `opt_${optIdx + 1}`,
          text: opt.text || opt,
          is_correct: opt.is_correct || false
        })),
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        difficulty: q.difficulty || difficulty,
        default_time_limit: q.time_limit || 30,
        default_points: q.points || 100
      }));

      // Ensure at least one correct option per question
      questionsList.forEach((q) => {
        if (q.options.length > 0 && !q.options.some((o) => o.is_correct)) {
          q.options[0].is_correct = true;
          q.correct_answer = q.options[0].text;
        }
      });

      if (questionsList.length === 0) {
        throw new Error('AI could not produce questions for this topic. Please try with more context or details.');
      }

      setGeneratedQuestions(questionsList);
      setStep('review');
    } catch (err) {
      console.error('AI generation error:', err);
      setErrorMessage(err.message || 'Failed to generate questions. Please ensure Ollama is running.');
      setStep('prompt');
    }
  };

  const handleUpdateQuestionText = (index, text) => {
    const updated = [...generatedQuestions];
    updated[index].question_text = text;
    setGeneratedQuestions(updated);
  };

  const handleUpdateOptionText = (qIndex, optIndex, text) => {
    const updated = [...generatedQuestions];
    updated[qIndex].options[optIndex].text = text;
    if (updated[qIndex].options[optIndex].is_correct) {
      updated[qIndex].correct_answer = text;
    }
    setGeneratedQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex, optIndex) => {
    const updated = [...generatedQuestions];
    updated[qIndex].options = updated[qIndex].options.map((opt, i) => ({
      ...opt,
      is_correct: i === optIndex
    }));
    updated[qIndex].correct_answer = updated[qIndex].options[optIndex].text;
    setGeneratedQuestions(updated);
  };

  const handleUpdateExplanation = (index, explanation) => {
    const updated = [...generatedQuestions];
    updated[index].explanation = explanation;
    setGeneratedQuestions(updated);
  };

  const handleDeleteQuestion = (index) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
  };

  const handleSaveToQuiz = async () => {
    if (generatedQuestions.length === 0) {
      setErrorMessage('No questions to save.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      const payload = generatedQuestions.map((q) => ({
        question_type: q.question_type || 'multiple_choice',
        question_text: q.question_text,
        options: q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          is_correct: opt.is_correct
        })),
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        category: 'General',
        difficulty: q.difficulty,
        tags: 'ai_generated',
        default_time_limit: q.default_time_limit || 30,
        default_points: q.default_points || 100
      }));

      if (quizId) {
        // Saving directly to existing quiz
        const updatedQuiz = await api.addBatchQuestionsToQuiz(quizId, payload);
        if (onQuestionsAdded) {
          onQuestionsAdded(updatedQuiz);
        }
      } else {
        // Appending to drafted quiz in QuizCreator
        if (onQuestionsAdded) {
          onQuestionsAdded(payload);
        }
      }
      handleClose();
    } catch (err) {
      console.error('Save questions error:', err);
      setErrorMessage(err.message || 'Failed to save questions to quiz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'review' ? 'Review & Edit AI Generated Questions' : 'Generate Quiz with AI'}
      maxWidth={step === 'review' ? 880 : 640}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#451A1A',
              color: '#FCA5A5',
              border: '1px solid #7F1D1D',
              fontSize: '0.875rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Prompt & Configuration */}
        {step === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Topic Input */}
            <div className="form-group">
              <label htmlFor="aiTopic" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                Topic, Subject, or Learning Objectives <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="aiTopic"
                rows={4}
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="e.g. Workplace Cybersecurity: Identifying phishing emails, password complexity, social engineering tactics, and reporting security incidents."
                className="form-control"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Provide specific concepts, scenarios, or guidelines to produce realistic, high-quality questions.
              </span>
            </div>

            {/* Question Count Selection: 5, 10, 15, 20 or Custom */}
            <div>
              <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                Number of Questions
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setNumQuestions(count);
                      setIsCustom(false);
                      setCustomCount('');
                    }}
                    className={`btn ${!isCustom && numQuestions === count ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minWidth: '80px', padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    {count} Questions
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className={`btn ${isCustom ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '80px', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Custom
                </button>
                {isCustom && (
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    placeholder="e.g. 8"
                    className="form-control"
                    style={{
                      width: '100px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Difficulty & Question Type */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="aiDifficulty" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                  Target Difficulty
                </label>
                <select
                  id="aiDifficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                >
                  <option value="easy">Easy — Introductory & Definitions</option>
                  <option value="medium">Medium — Practical Applications</option>
                  <option value="hard">Hard — Complex Scenarios & Edge Cases</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="aiQuestionType" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                  Question Format
                </label>
                <select
                  id="aiQuestionType"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                >
                  <option value="multiple_choice">Multiple Choice (4 Options)</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>
            </div>

            {/* AI Engine Status Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: '#94A3B8'
              }}
            >
              <Cpu size={18} color="var(--color-teal)" />
              <div>
                <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Powered by Local Ollama AI Engine</span>
                <span style={{ display: 'block', color: '#94A3B8' }}>
                  Runs completely privately on your infrastructure using the llama3.2:3b model. No third-party data transmission.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
              >
                <Sparkles size={16} />
                <span>Generate Questions</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Generating Loading Screen */}
        {step === 'generating' && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                color: '#06B6D4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                animation: 'pulse 1.8s infinite ease-in-out'
              }}
            >
              <Sparkles size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Generating Questions with Ollama...
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 24px' }}>
              Analyzing the requested topic, crafting realistic scenarios, and formulating distractors with accurate answers.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
            >
              <RefreshCw size={14} className="spinning" />
              <span>Model: llama3.2:3b • Target: {isCustom ? customCount : numQuestions} Questions</span>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Edit Screen */}
        {step === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  Generated {generatedQuestions.length} Questions
                </span>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Review each question, edit wording or options, and choose the correct answer before adding to your quiz.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('prompt')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={14} />
                <span>Adjust Prompt</span>
              </button>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '6px' }}>
              {generatedQuestions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  style={{
                    padding: '18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--primary-color)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        {qIndex + 1}
                      </span>
                      <span className="badge-pill brand" style={{ fontSize: '0.725rem' }}>
                        {q.question_type.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIndex)}
                      className="btn-ghost"
                      title="Delete question"
                      style={{ color: 'var(--color-danger)', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Question Text Input */}
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                      Question Text
                    </label>
                    <textarea
                      rows={2}
                      value={q.question_text}
                      onChange={(e) => handleUpdateQuestionText(qIndex, e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  {/* Options List */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                      Options & Correct Answer (Click radio to set correct)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '10px' }}>
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={opt.id || optIndex}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${opt.is_correct ? 'var(--color-success)' : 'var(--border-color)'}`,
                            backgroundColor: opt.is_correct ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)'
                          }}
                        >
                          <input
                            type="radio"
                            name={`correct_opt_${qIndex}`}
                            checked={opt.is_correct}
                            onChange={() => handleSetCorrectOption(qIndex, optIndex)}
                            style={{ cursor: 'pointer', accentColor: 'var(--color-success)' }}
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOptionText(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            style={{
                              flex: 1,
                              border: 'none',
                              backgroundColor: 'transparent',
                              fontSize: '0.85rem',
                              color: 'var(--text-main)',
                              fontWeight: opt.is_correct ? 600 : 400
                            }}
                          />
                          {opt.is_correct && (
                            <Check size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                      Answer Explanation (Optional)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateExplanation(qIndex, e.target.value)}
                      placeholder="Why is this answer correct?"
                      className="form-control"
                      style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {generatedQuestions.length} questions ready to append
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || generatedQuestions.length === 0}
                  onClick={handleSaveToQuiz}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                >
                  <CheckCircle2 size={16} />
                  <span>{saving ? 'Saving...' : `Add ${generatedQuestions.length} Questions to Quiz`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
