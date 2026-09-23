import React, { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { sound } from '../utils/sound';

export default function QuestionPreview({ question, onFinish = null }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);

  if (!question) return null;

  const handleSelect = (opt) => {
    if (isRevealed) return;
    setSelectedOption(opt);
    setIsRevealed(true);

    if (opt.is_correct) {
      sound.playCorrect();
    } else {
      sound.playIncorrect();
    }
  };

  const handleTextSubmit = () => {
    if (isRevealed || !textInput.trim()) return;
    setIsRevealed(true);
    const isCorrect = textInput.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase();
    if (isCorrect) {
      sound.playCorrect();
    } else {
      sound.playIncorrect();
    }
  };

  const handleReset = () => {
    setSelectedOption(null);
    setTextInput('');
    setIsRevealed(false);
  };

  const options = question.options || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Question Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-teal">{question.category || 'General'}</span>
          <span className="badge badge-gray">{question.question_type?.replace('_', ' ')}</span>
          <span className="badge badge-gold">{question.difficulty}</span>
        </div>
        <button
          onClick={handleReset}
          className="btn btn-outline btn-sm"
          style={{ fontSize: '0.75rem' }}
        >
          <RefreshCw size={14} /> Reset Test
        </button>
      </div>

      {/* Question Text */}
      <div style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        color: 'var(--color-primary-dark)',
        padding: '16px 20px',
        backgroundColor: '#0F172A',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)'
      }}>
        {question.question_text}
      </div>

      {/* Options or Text Input */}
      {options.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            This is a <strong>Short Answer</strong> question. Enter an answer below to test validation:
          </div>
          <input
            type="text"
            placeholder="Type your answer..."
            value={textInput}
            disabled={isRevealed}
            onChange={(e) => setTextInput(e.target.value)}
            style={{ padding: '12px 16px', fontSize: '1rem' }}
          />
          {!isRevealed ? (
            <button
              onClick={handleTextSubmit}
              className="btn btn-teal"
              disabled={!textInput.trim()}
            >
              Test Answer
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 8,
              backgroundColor: textInput.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase() ? '#DCFCE7' : '#FEE2E2',
              border: `1px solid ${textInput.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase() ? '#86EFAC' : '#FCA5A5'}`,
              color: textInput.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase() ? '#166534' : '#991B1B',
              fontWeight: 700
            }}>
              <span>Expected Answer: {question.correct_answer}</span>
              {textInput.trim().toLowerCase() === (question.correct_answer || '').trim().toLowerCase() ? (
                <CheckCircle2 size={18} color="var(--color-success)" />
              ) : (
                <XCircle size={18} color="var(--color-danger)" />
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((opt, idx) => {
            const isSelected = selectedOption && selectedOption.id === opt.id;
            let optBg = '#FFFFFF';
            let optBorder = 'var(--border-medium)';
            let optColor = 'var(--text-main)';

            if (isRevealed) {
              if (opt.is_correct) {
                optBg = '#D1FAE5';
                optBorder = 'var(--color-success)';
                optColor = '#065F46';
              } else if (isSelected && !opt.is_correct) {
                optBg = '#FEE2E2';
                optBorder = 'var(--color-danger)';
                optColor = '#991B1B';
              }
            } else if (isSelected) {
              optBg = 'var(--color-teal-subtle)';
              optBorder = 'var(--color-teal)';
            }

            return (
              <button
                key={opt.id || idx}
                onClick={() => handleSelect(opt)}
                disabled={isRevealed}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 10,
                  border: `2px solid ${optBorder}`,
                  backgroundColor: optBg,
                  color: optColor,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textAlign: 'left',
                  cursor: isRevealed ? 'default' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt.text}</span>
                </div>

                {isRevealed && (
                  <div>
                    {opt.is_correct && <CheckCircle2 size={20} color="var(--color-success)" />}
                    {isSelected && !opt.is_correct && <XCircle size={20} color="var(--color-danger)" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Explanation Box */}
      {isRevealed && (
        <div style={{
          marginTop: 8,
          padding: 16,
          borderRadius: 10,
          backgroundColor: selectedOption?.is_correct ? '#ECFDF5' : '#FFFBEB',
          border: `1px solid ${selectedOption?.is_correct ? '#A7F3D0' : '#FDE68A'}`,
          animation: 'fadeIn 0.2s ease-in'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
            <HelpCircle size={16} color={selectedOption?.is_correct ? 'var(--color-success)' : 'var(--color-accent)'} />
            <span>{selectedOption?.is_correct ? 'Correct! Explanation:' : 'Incorrect. Rationale:'}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
            {question.explanation || 'No detailed explanation provided for this question.'}
          </p>
        </div>
      )}
    </div>
  );
}
