import React from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Edit3,
  Copy,
  Trash2,
  HelpCircle,
  Clock,
  Flame,
  CheckCircle2,
  Eye,
  Swords,
  FolderOpen,
  FileDown,
  Calendar
} from 'lucide-react';

export default function QuizCard({ quiz, onStartLive, onStartBattle, onEdit, onDuplicate, onDelete, onPreview, onOpen, onExportPdf }) {
  const settings = quiz.settings || {};

  return (
    <div className="kuizila-card kuizila-card-interactive" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Meta Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="badge badge-teal">
          {quiz.category || 'General'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {settings.timebomb_enabled && (
            <span className="badge badge-gold" title="Time Bomb suspense enabled">
              <Flame size={12} /> Time Bomb
            </span>
          )}
          <span className="badge badge-gray" title="Permanent storage without 3-month expiration">
            <CheckCircle2 size={12} color="var(--color-teal)" /> Permanent
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>
        <Link
          to={`/quizzes/${quiz.id}`}
          style={{ color: 'var(--text-main)', textDecoration: 'none', transition: 'color 0.15s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-teal)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-main)'}
        >
          {quiz.title}
        </Link>
      </h3>
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: 16,
        flex: 1,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {quiz.description || 'No description provided.'}
      </p>

      {/* Info Stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 0',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 16,
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <HelpCircle size={15} color="var(--color-teal)" />
          <strong>{quiz.question_count || (quiz.quiz_questions ? quiz.quiz_questions.length : 0)}</strong> Questions
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={14} color="#94A3B8" />
          {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString() : 'Recent'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Clock size={15} color="var(--color-primary)" />
          {settings.time_limit || 30}s / question
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Link
          to={`/quizzes/${quiz.id}`}
          className="btn btn-outline btn-sm"
          style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          title="Open Quiz details and manage questions"
        >
          <FolderOpen size={14} />
          <span>Open Quiz</span>
        </Link>

        <button
          onClick={() => onStartLive(quiz)}
          className="btn btn-teal btn-sm"
          style={{ flex: 1, fontWeight: 700, minWidth: 80 }}
        >
          <Play size={14} fill="currentColor" />
          <span>Live</span>
        </button>

        {onStartBattle && (
          <button
            onClick={() => onStartBattle(quiz)}
            className="btn btn-accent btn-sm"
            style={{ flex: 1, fontWeight: 700, minWidth: 80 }}
            title="Launch Employee Battle Mode"
          >
            <Swords size={14} />
            <span>Battle</span>
          </button>
        )}

        {onPreview && (
          <button
            onClick={() => onPreview(quiz)}
            className="btn btn-outline btn-sm"
            title="Preview Quiz"
          >
            <Eye size={15} />
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(quiz)}
            className="btn btn-outline btn-sm"
            title="Edit Quiz"
          >
            <Edit3 size={15} />
          </button>
        )}

        {onExportPdf && (
          <button
            onClick={() => onExportPdf(quiz)}
            className="btn btn-outline btn-sm"
            title="Export Quiz as PDF"
          >
            <FileDown size={15} color="var(--color-teal)" />
          </button>
        )}

        {onDuplicate && (
          <button
            onClick={() => onDuplicate(quiz)}
            className="btn btn-outline btn-sm"
            title="Duplicate Quiz"
          >
            <Copy size={15} />
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(quiz)}
            className="btn btn-outline btn-sm"
            title="Delete Quiz"
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
