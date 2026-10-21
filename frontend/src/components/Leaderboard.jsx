import React, { useState } from 'react';
import { Trophy, Medal, Flame, Award, User, Shield, Heart, Users } from 'lucide-react';
import Avatar from './Avatar';

export default function Leaderboard({ standings = [], teamStandings = [], showPodium = true }) {
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'teams'

  const hasTeams = teamStandings && teamStandings.length > 0;

  if ((!standings || standings.length === 0) && (!teamStandings || teamStandings.length === 0)) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <Trophy size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p>No participant scores recorded yet.</p>
      </div>
    );
  }

  const parseAvatar = (cfg) => {
    if (!cfg) return null;
    try {
      return typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
    } catch {
      return null;
    }
  };

  const top1 = standings[0];
  const top2 = standings[1];
  const top3 = standings[2];

  return (
    <div style={{ width: '100%', maxWidth: 740, margin: '0 auto' }}>
      {/* Tabs if team standings are present */}
      {hasTeams && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`btn btn-sm ${activeTab === 'individual' ? 'btn-teal' : 'btn-outline'}`}
            style={{ fontWeight: 700 }}
          >
            <User size={14} />
            <span>Individual Contenders</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`btn btn-sm ${activeTab === 'teams' ? 'btn-teal' : 'btn-outline'}`}
            style={{ fontWeight: 700 }}
          >
            <Shield size={14} />
            <span>Team Standings</span>
          </button>
        </div>
      )}

      {/* TEAM STANDINGS VIEW */}
      {activeTab === 'teams' && hasTeams && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {teamStandings.map((t, idx) => {
            const isLeader = idx === 0;
            return (
              <div
                key={t.team_id || idx}
                className="kuizila-card"
                style={{
                  padding: '18px 24px',
                  borderLeft: `6px solid ${t.team_color || 'var(--color-teal)'}`,
                  backgroundColor: isLeader ? 'rgba(15, 118, 110, 0.04)' : '#FFFFFF',
                  animation: 'fadeIn 0.3s ease-in'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: isLeader ? 'var(--color-accent)' : '#F1F5F9',
                      color: isLeader ? '#0F172A' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.9rem'
                    }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>
                        {t.team_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.member_count || (t.members ? t.members.length : 0)} Team Members
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--color-teal)' }}>
                      {t.team_score} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                    </div>
                  </div>
                </div>

                {/* Team member avatars */}
                {t.members && t.members.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Roster:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {t.members.map((m, mIdx) => {
                        const mAvatar = parseAvatar(m.avatar_config);
                        return (
                          <div
                            key={m.participant_id || mIdx}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, backgroundColor: '#0F172A', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}
                            title={`${m.display_name}: ${m.score || 0} pts`}
                          >
                            {mAvatar ? (
                              <Avatar config={mAvatar} size={20} />
                            ) : (
                              <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                {m.display_name.charAt(0)}
                              </span>
                            )}
                            <span style={{ fontWeight: 600 }}>{m.display_name}</span>
                            <span style={{ color: 'var(--color-teal)', fontWeight: 700 }}>({m.score || 0})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* INDIVIDUAL CONTENDERS VIEW */}
      {activeTab === 'individual' && (
        <>
          {showPodium && standings.length >= 2 && (
            <div className="podium-container">
              {/* 2nd Place */}
              {top2 && (
                <div className="podium-pillar podium-2">
                  <div style={{ marginBottom: 6 }}>
                    {parseAvatar(top2.avatar_config) ? (
                      <Avatar config={parseAvatar(top2.avatar_config)} size={48} />
                    ) : (
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: '#1E293B',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        2
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {top2.display_name}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 4 }}>
                    {top2.score} pts
                  </div>
                  {top2.streak > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', marginTop: 4 }}>
                      <Flame size={13} fill="#FEF08A" color="#FEF08A" /> {top2.streak} streak
                    </div>
                  )}
                </div>
              )}

              {/* 1st Place (Champion) */}
              {top1 && (
                <div className="podium-pillar podium-1">
                  <Trophy size={28} fill="#FEF08A" color="#FEF08A" style={{ marginBottom: 4 }} />
                  <div style={{ marginBottom: 6, animation: 'celebrationHop 1.5s infinite ease-in-out' }}>
                    {parseAvatar(top1.avatar_config) ? (
                      <Avatar config={parseAvatar(top1.avatar_config)} size={56} />
                    ) : (
                      <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        backgroundColor: '#1E293B',
                        color: '#B45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        1
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', textAlign: 'center', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {top1.display_name}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.3rem', marginTop: 4 }}>
                    {top1.score} pts
                  </div>
                  {top1.streak > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.8rem', marginTop: 4 }}>
                      <Flame size={14} fill="#FEF08A" color="#FEF08A" /> {top1.streak} streak
                    </div>
                  )}
                </div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <div className="podium-pillar podium-3">
                  <div style={{ marginBottom: 6 }}>
                    {parseAvatar(top3.avatar_config) ? (
                      <Avatar config={parseAvatar(top3.avatar_config)} size={44} />
                    ) : (
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: '#1E293B',
                        color: '#78350F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        3
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {top3.display_name}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: 4 }}>
                    {top3.score} pts
                  </div>
                  {top3.streak > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', marginTop: 4 }}>
                      <Flame size={13} fill="#FEF08A" color="#FEF08A" /> {top3.streak} streak
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Table List */}
          <div className="kuizila-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0F172A', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', width: 60 }}>RANK</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>CONTENDER</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>STREAK</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>SCORE</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((p, idx) => {
                  const rank = p.rank || (idx + 1);
                  const pAvatar = parseAvatar(p.avatar_config);

                  return (
                    <tr
                      key={p.participant_id || idx}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: rank === 1 ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                        transition: 'background-color 0.15s',
                        opacity: p.is_eliminated ? 0.6 : 1
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {pAvatar ? (
                            <Avatar config={pAvatar} size={34} showStatus={!p.is_eliminated} />
                          ) : (
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-teal-subtle)',
                              color: 'var(--color-teal)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {p.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {p.display_name}
                              </span>
                              {p.team_name && (
                                <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, backgroundColor: '#334155', color: '#94A3B8', fontWeight: 600 }}>
                                  {p.team_name}
                                </span>
                              )}
                            </div>

                            {p.remaining_lives !== undefined && p.remaining_lives !== null && (
                              <div style={{ fontSize: '0.7rem', color: '#EF4444', marginTop: 2 }}>
                                {p.is_eliminated ? '💀 Eliminated' : '❤️'.repeat(Math.max(0, p.remaining_lives))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {p.streak > 1 ? (
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                            <Flame size={12} /> {p.streak}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                        {p.score} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

