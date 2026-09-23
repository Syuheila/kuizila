import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  BarChart3,
  Download,
  Search,
  Sparkles,
  Users,
  Target,
  Clock,
  Trophy,
  HelpCircle,
  FileSpreadsheet,
  Flame,
  Printer,
  CheckCircle2,
  XCircle,
  Play,
  AlertTriangle,
  Layers
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { api } from '../services/api';

export default function Reports() {
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id');

  const [dashboardData, setDashboardData] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId || '');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participantSearch, setParticipantSearch] = useState('');
  const [drilldownSearch, setDrilldownSearch] = useState('');

  // AI Summary & Insights State
  const [aiSummaryModal, setAiSummaryModal] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiTab, setAiTab] = useState('insights'); // 'insights' | 'executive'
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadSessionsList();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionReport(selectedSessionId);
    } else {
      setReport(null);
      setLoading(false);
    }
  }, [selectedSessionId]);

  const loadSessionsList = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardData();
      setDashboardData(data);
      if (!selectedSessionId && data.recent_sessions && data.recent_sessions.length > 0) {
        setSelectedSessionId(data.recent_sessions[0].id);
      } else if (!data.recent_sessions || data.recent_sessions.length === 0) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load session list:', err);
      setLoading(false);
    }
  };

  const loadSessionReport = async (sessionId) => {
    try {
      setLoading(true);
      const data = await api.getSessionReport(sessionId);
      setReport(data);
    } catch (err) {
      console.error('Failed to load session report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedSessionId) return;
    try {
      await api.downloadReportCSV(selectedSessionId, `loomi_report_${report?.session_code || 'session'}.csv`);
    } catch (err) {
      alert(`CSV Export failed: ${err.message}`);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!selectedSessionId) return;
    try {
      setAiLoading(true);
      setAiSummaryModal(true);
      const [summary, insights] = await Promise.all([
        api.analyzePerformanceAI(selectedSessionId).catch(() => null),
        api.getAIQuizInsights(selectedSessionId).catch(() => null)
      ]);
      setAiSummary(summary);
      setAiInsights(insights);
    } catch (err) {
      alert(`AI Summary error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const chartData = (report?.questions_analytics || []).map((q, idx) => ({
    name: `Q${idx + 1}`,
    accuracy: q.accuracy_percentage,
    fullText: q.question_text
  }));

  const filteredLeaderboard = (report?.leaderboard || []).filter((p) =>
    p.display_name.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const filteredResponses = (report?.participant_responses || []).filter((r) =>
    r.participant_name.toLowerCase().includes(drilldownSearch.toLowerCase()) ||
    r.question_text.toLowerCase().includes(drilldownSearch.toLowerCase()) ||
    String(r.selected_answer).toLowerCase().includes(drilldownSearch.toLowerCase())
  );

  const hasSessions = (dashboardData?.recent_sessions || []).length > 0;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
            Analytics & Reports
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
            Workshop performance metrics, question accuracy breakdowns, and participant responses.
          </p>
        </div>

        {/* Session Dropdown & Export Buttons */}
        {hasSessions && (
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                minWidth: 'min(100%, 240px)',
                maxWidth: '100%',
                padding: '10px 14px',
                backgroundColor: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid #334155',
                borderRadius: 8
              }}
            >
              {(dashboardData?.recent_sessions || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.quiz_title} ({s.session_code}) • {s.date}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateAISummary}
              disabled={!selectedSessionId}
              className="btn btn-outline"
              style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
            >
              <Sparkles size={16} />
              <span>AI Summary</span>
            </button>

            <button
              onClick={() => window.print()}
              disabled={!selectedSessionId}
              className="btn btn-outline"
              title="Print or Save as PDF"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!selectedSessionId}
              className="btn btn-teal"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
          Loading performance analytics...
        </div>
      ) : !hasSessions ? (
        <div className="loomi-card" style={{ textAlign: 'center', padding: '56px 20px', backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <BarChart3 size={44} style={{ margin: '0 auto 12px', color: '#94A3B8' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
            No analytics yet
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '20px', maxWidth: '440px', margin: '0 auto 20px' }}>
            Analytics will appear here automatically after you launch and complete your first live workshop session.
          </p>
          <Link to="/quizzes" className="btn btn-teal">
            <Play size={16} />
            <span>Launch a Quiz Session</span>
          </Link>
        </div>
      ) : !report ? (
        <div className="loomi-card" style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <h3 style={{ color: '#F8FAFC' }}>No Session Selected</h3>
          <p style={{ color: '#94A3B8' }}>Please select a quiz session above to view its analytics.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Executive Overview KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 16
          }}>
            <StatCard
              title="PARTICIPANTS"
              value={report.total_participants}
              subtitle={`${report.completed_participants} completed`}
              icon={Users}
              color="teal"
            />
            <StatCard
              title="AVERAGE ACCURACY"
              value={`${report.average_accuracy}%`}
              subtitle="Session comprehension score"
              icon={Target}
              color="navy"
            />
            <StatCard
              title="HIGHEST SCORE"
              value={`${report.highest_score} pts`}
              subtitle={`Lowest: ${report.lowest_score} pts`}
              icon={Trophy}
              color="gold"
            />
            <StatCard
              title="AVG RESPONSE TIME"
              value={`${report.average_response_time}s`}
              subtitle="Speed across questions"
              icon={Clock}
              color="emerald"
            />
          </div>

          {/* Question Accuracy Chart */}
          <div className="loomi-card" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Question Comprehension & Accuracy (%)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                  Percentage of participants who answered correctly on first attempt.
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} stroke="#334155" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94A3B8' }} stroke="#334155" unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: 8 }}
                    itemStyle={{ color: '#06B6D4' }}
                    formatter={(value) => [`${value}%`, 'Accuracy']}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullText || label}
                  />
                  <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.accuracy >= 75 ? '#14B8A6' : entry.accuracy >= 50 ? '#F59E0B' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Participant Performance Ranking Table */}
          <div className="loomi-card" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Participant Performance Ranking ({report.leaderboard?.length || 0})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Overall score, accuracy percentage, and response speed per attendee.
                </p>
              </div>

              <div style={{ position: 'relative', width: 240 }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search participant..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  style={{
                    paddingLeft: 32,
                    padding: '6px 12px 6px 32px',
                    fontSize: '0.85rem',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table style={{ minWidth: 600, width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F172A', borderBottom: '2px solid #334155' }}>
                    <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em' }}>RANK</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em' }}>PARTICIPANT</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em', textAlign: 'right' }}>SCORE</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em', textAlign: 'center' }}>ACCURACY</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em', textAlign: 'center' }}>MAX STREAK</th>
                    <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em', textAlign: 'right' }}>AVG TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((p) => (
                    <tr key={p.participant_id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#F8FAFC' }}>
                        {p.rank === 1 ? '🥇 1' : p.rank === 2 ? '🥈 2' : p.rank === 3 ? '🥉 3' : `#${p.rank}`}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#F8FAFC' }}>{p.display_name}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#38BDF8' }}>
                        {p.score} pts
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: p.accuracy_percentage >= 75 ? 'rgba(16, 185, 129, 0.15)' : p.accuracy_percentage >= 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: p.accuracy_percentage >= 75 ? '#34D399' : p.accuracy_percentage >= 60 ? '#FBBF24' : '#F87171',
                          border: `1px solid ${p.accuracy_percentage >= 75 ? 'rgba(16, 185, 129, 0.3)' : p.accuracy_percentage >= 60 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {p.accuracy_percentage}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {p.streak > 1 ? (
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                            <Flame size={11} /> {p.streak}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#94A3B8', fontSize: '0.85rem' }}>
                        {p.avg_response_time}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Granular Participant Responses Drilldown */}
          <div className="loomi-card" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Granular Participant Responses ({filteredResponses.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Individual participant submissions, answer correctness, points, and latency.
                </p>
              </div>

              <div style={{ position: 'relative', width: 260 }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter by name, question, answer..."
                  value={drilldownSearch}
                  onChange={(e) => setDrilldownSearch(e.target.value)}
                  style={{
                    paddingLeft: 32,
                    padding: '6px 12px 6px 32px',
                    fontSize: '0.85rem',
                    backgroundColor: '#0F172A',
                    color: '#F8FAFC',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    width: '100%'
                  }}
                />
              </div>
            </div>

            {filteredResponses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: '0.875rem' }}>
                No response submissions recorded yet for this session.
              </div>
            ) : (
              <div className="table-responsive-wrapper">
                <table style={{ minWidth: 640, width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0F172A', borderBottom: '2px solid #334155' }}>
                      <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC' }}>PARTICIPANT</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC' }}>QUESTION</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC' }}>ANSWER GIVEN</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', textAlign: 'center' }}>CORRECT</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', textAlign: 'right' }}>POINTS</th>
                      <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC', textAlign: 'right' }}>TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResponses.map((r, rIdx) => (
                      <tr key={r.id || rIdx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                          {r.participant_name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#F8FAFC', maxWidth: 300 }}>
                          <span style={{ fontSize: '0.875rem' }}>{r.question_text}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '0.875rem' }}>
                          {r.selected_answer || '(No Answer)'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {r.is_correct ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34D399', fontSize: '0.8rem', fontWeight: 700 }}>
                              <CheckCircle2 size={16} /> Yes
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#F87171', fontSize: '0.8rem', fontWeight: 700 }}>
                              <XCircle size={16} /> No
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: r.points_awarded > 0 ? '#38BDF8' : '#64748B' }}>
                          +{r.points_awarded}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#94A3B8', fontSize: '0.85rem' }}>
                          {r.response_time_seconds ? `${r.response_time_seconds}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Question Analytics Section */}
          <div className="loomi-card" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, color: '#F8FAFC' }}>
              Detailed Question Analytics
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(report.questions_analytics || []).map((q, idx) => {
                const isWeak = q.accuracy_percentage < 60;
                return (
                  <div
                    key={q.question_id || idx}
                    style={{
                      padding: '20px 22px',
                      borderRadius: 12,
                      backgroundColor: '#0F172A',
                      border: `1px solid ${isWeak ? 'rgba(239, 68, 68, 0.4)' : '#334155'}`,
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14
                    }}
                  >
                    {/* Question Header & Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-navy" style={{ fontSize: '0.8rem', padding: '4px 10px', fontWeight: 800 }}>
                          Question {idx + 1}
                        </span>
                        <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>
                          {q.question_type?.replace('_', ' ')}
                        </span>
                        <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                          {q.difficulty}
                        </span>
                        {isWeak && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#F87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            <AlertTriangle size={12} /> Needs Attention (&lt;60%)
                          </span>
                        )}
                      </div>

                      <span style={{
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        color: q.accuracy_percentage >= 70 ? '#34D399' : '#F87171'
                      }}>
                        {q.accuracy_percentage}% Accuracy
                      </span>
                    </div>

                    {/* Question Text */}
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.4 }}>
                      {q.question_text}
                    </div>

                    {/* Correct Answer Banner */}
                    {q.correct_answer && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34D399',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        <CheckCircle2 size={18} color="#34D399" style={{ flexShrink: 0 }} />
                        <span><strong>Correct Answer:</strong> {q.correct_answer}</span>
                      </div>
                    )}

                    {/* 4-Metric Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid #334155'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                          Total Answered
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', marginTop: 2 }}>
                          {q.total_answered}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
                          Number Correct
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                          {q.correct_count}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#F87171', fontWeight: 700, textTransform: 'uppercase' }}>
                          Number Incorrect
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F87171', marginTop: 2 }}>
                          {q.incorrect_count !== undefined ? q.incorrect_count : Math.max(0, q.total_answered - q.correct_count)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                          Avg Response Time
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38BDF8', marginTop: 2 }}>
                          {q.avg_response_time}s
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Performance Summary & Insights Modal */}
      <Modal
        isOpen={aiSummaryModal}
        onClose={() => setAiSummaryModal(false)}
        title="📊 AI Cohort Diagnostics & Performance Summary"
        maxWidth={760}
      >
        {aiLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
            <Sparkles size={36} color="var(--color-accent)" style={{ animation: 'spin 2s linear infinite', marginBottom: 12 }} />
            <p>Synthesizing workshop diagnostic analysis and separating facts from interpretations...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'flex',
              gap: 8,
              padding: 4,
              backgroundColor: '#0F172A',
              borderRadius: 8,
              border: '1px solid #334155'
            }}>
              <button
                type="button"
                onClick={() => setAiTab('insights')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: aiTab === 'insights' ? 'var(--color-teal)' : 'transparent',
                  color: aiTab === 'insights' ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  transition: 'all 0.15s'
                }}
              >
                Diagnostic Insights (Fact vs Interpretation)
              </button>
              <button
                type="button"
                onClick={() => setAiTab('executive')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: aiTab === 'executive' ? 'var(--color-teal)' : 'transparent',
                  color: aiTab === 'executive' ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  transition: 'all 0.15s'
                }}
              >
                Executive Performance Summary
              </button>
            </div>

            {/* TAB 1: DIAGNOSTIC INSIGHTS (FACT VS INTERPRETATION) */}
            {aiTab === 'insights' && (
              aiInsights ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {aiInsights.executive_summary && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(20, 184, 166, 0.12)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      fontSize: '0.9rem',
                      color: '#5EEAD4',
                      lineHeight: 1.5
                    }}>
                      <strong style={{ color: '#F8FAFC' }}>Cohort Assessment:</strong> {aiInsights.executive_summary}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* FACTS Panel */}
                    <div style={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #10B981',
                      borderRadius: 8,
                      padding: 14
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                          FACT (Empirical Data)
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(aiInsights.factual_summary || []).map((f, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: '#E2E8F0', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 }}>
                            <span style={{ color: '#10B981', fontWeight: 800 }}>&bull;</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* INTERPRETATIONS Panel */}
                    <div style={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #8B5CF6',
                      borderRadius: 8,
                      padding: 14
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span className="badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', border: '1px solid #8B5CF6', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                          INTERPRETATION (Pedagogical Hypotheses)
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(aiInsights.interpretations || []).map((item, i) => (
                          <div key={i} style={{ fontSize: '0.78rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                            <div style={{ fontWeight: 700, color: '#A78BFA' }}>
                              Q{item.question_number}: {item.learner_misconception}
                            </div>
                            {item.pedagogical_insight && (
                              <div style={{ color: '#94A3B8', marginTop: 2, fontStyle: 'italic' }}>
                                Tip: {item.pedagogical_insight}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {aiInsights.recommendations?.length > 0 && (
                    <div style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 8,
                      padding: 12
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FBBF24', textTransform: 'uppercase' }}>
                        Trainer Action Items
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                        {aiInsights.recommendations.map((rec, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: '#FEF3C7', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <span style={{ color: '#F59E0B' }}>&bull;</span>
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  No participant responses available to generate diagnostic insights.
                </div>
              )
            )}

            {/* TAB 2: EXECUTIVE PERFORMANCE SUMMARY */}
            {aiTab === 'executive' && (
              aiSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(20, 184, 166, 0.12)',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                    fontSize: '0.9rem',
                    color: '#5EEAD4',
                    lineHeight: 1.6
                  }}>
                    <strong style={{ color: '#F8FAFC' }}>Executive Summary:</strong> {aiSummary.overall_summary}
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34D399', marginBottom: 6 }}>
                      Key Workshop Strengths:
                    </h4>
                    <ul style={{ paddingLeft: 20, fontSize: '0.82rem', color: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(aiSummary.strengths || []).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F87171', marginBottom: 6 }}>
                      Knowledge Gaps & Topics for Review:
                    </h4>
                    <ul style={{ paddingLeft: 20, fontSize: '0.82rem', color: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(aiSummary.areas_for_improvement || []).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38BDF8', marginBottom: 6 }}>
                      Trainer Action Items:
                    </h4>
                    <ul style={{ paddingLeft: 20, fontSize: '0.82rem', color: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(aiSummary.actionable_recommendations || []).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                  No executive summary available for this session.
                </div>
              )
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, borderTop: '1px solid #334155', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setAiSummaryModal(false)}
                className="btn btn-teal"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
