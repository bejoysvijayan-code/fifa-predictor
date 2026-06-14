import { sortLeaderboard } from '../utils/scoring';
import { useAuth } from '../contexts/AuthContext';

const PODIUM = [
  { emoji: '🥇', bg: 'rgba(240,180,41,0.10)', border: 'rgba(240,180,41,0.24)', color: '#F0B429' },
  { emoji: '🥈', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.20)', color: '#94A3B8' },
  { emoji: '🥉', bg: 'rgba(180,120,70,0.08)', border: 'rgba(180,120,70,0.20)', color: '#CD7F32' },
];

export default function LeaderboardTable({ users }) {
  const { user } = useAuth();
  const sorted = sortLeaderboard(users);

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-5xl">🏆</span>
        <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Leaderboard appears once predictions are scored.
        </p>
      </div>
    );
  }

  const top3 = sorted.slice(0, Math.min(3, sorted.length));
  const rest = sorted.slice(3);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {top3.map((u, i) => {
          const p = PODIUM[i];
          const isMe = u.uid === user?.uid;
          return (
            <div
              key={u.id}
              className="rounded-2xl p-4 flex flex-col items-center text-center"
              style={{
                background: p.bg,
                border: `1px solid ${p.border}`,
                ...(isMe ? { boxShadow: '0 0 20px rgba(91,108,248,0.2)' } : {}),
              }}
            >
              <div className="text-2xl mb-2">{p.emoji}</div>
              {u.photoURL ? (
                <img
                  src={u.photoURL}
                  alt={u.displayName}
                  className="w-10 h-10 rounded-full mb-2"
                  style={{ border: `2px solid ${p.border}` }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 text-white"
                  style={{ background: '#5B6CF8' }}
                >
                  {u.displayName?.[0] || '?'}
                </div>
              )}
              <div className="text-[12px] font-semibold truncate w-full" style={{ color: '#E8EAFF' }}>
                {u.displayName?.split(' ')[0]}
                {isMe && <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>(you)</span>}
              </div>
              <div className="mt-2.5">
                <div className="text-[16px] font-bold" style={{ color: p.color }}>{u.correctPredictions}</div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.28)' }}>correct</div>
              </div>
              <div className="mt-1 text-[11px] font-bold" style={{ color: p.color }}>{u.totalPoints} pts</div>
            </div>
          );
        })}
      </div>

      {/* Remaining rows */}
      {rest.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {rest.map((u, i) => {
            const rank = i + 4;
            const isMe = u.uid === user?.uid;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < rest.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: isMe ? 'rgba(91,108,248,0.08)' : '#0D0D1A',
                }}
              >
                <div
                  className="w-6 text-center text-[12px] font-bold flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.22)' }}
                >
                  {rank}
                </div>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{ background: '#5B6CF8' }}
                    >
                      {u.displayName?.[0] || '?'}
                    </div>
                  )}
                  <span
                    className="text-[13px] font-medium truncate"
                    style={{ color: isMe ? '#8B9CFF' : '#E8EAFF' }}
                  >
                    {u.displayName}
                    {isMe && <span className="text-[11px] ml-1" style={{ color: 'rgba(255,255,255,0.28)' }}>(you)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-[12px] font-semibold" style={{ color: '#4ADE80' }}>{u.correctPredictions}</span>
                  <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    {u.accuracyPercentage?.toFixed(0)}%
                  </span>
                  <span className="text-[12px] font-bold" style={{ color: '#F0B429' }}>{u.totalPoints}pt</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
