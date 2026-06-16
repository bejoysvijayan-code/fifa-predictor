import { sortLeaderboard } from '../utils/scoring';
import { useAuth } from '../contexts/AuthContext';

const PODIUM = [
  { emoji: '🥇', bg: 'var(--c-gold-bg)',           border: 'var(--c-gold-bd)',           color: 'var(--c-gold)' },
  { emoji: '🥈', bg: 'rgba(148,163,184,0.08)',      border: 'rgba(148,163,184,0.20)',      color: '#94A3B8' },
  { emoji: '🥉', bg: 'rgba(180,120,70,0.08)',       border: 'rgba(180,120,70,0.20)',       color: '#CD7F32' },
];

function TickX({ correct, wrong }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: 'var(--c-green)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15" />
          <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {correct}
      </span>
      <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: 'var(--c-red)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15" />
          <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {wrong}
      </span>
    </div>
  );
}

export default function LeaderboardTable({ users }) {
  const { user } = useAuth();
  const sorted = sortLeaderboard(users);

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-5xl">🏆</span>
        <p className="text-[14px]" style={{ color: 'var(--c-t3)' }}>
          Leaderboard appears once predictions are scored.
        </p>
      </div>
    );
  }

  const top3 = sorted.slice(0, Math.min(3, sorted.length));
  const rest  = sorted.slice(3);

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Top 3 podium boxes ── */}
      <div className="grid grid-cols-3 gap-3">
        {top3.map((u, i) => {
          const p = PODIUM[i];
          const isMe = u.uid === user?.uid;
          const wrong = (u.totalPredictions || 0) - (u.correctPredictions || 0);
          return (
            <div
              key={u.id}
              className="rounded-2xl p-4 flex flex-col items-center text-center"
              style={{
                background: p.bg,
                border: `1px solid ${p.border}`,
                ...(isMe ? { boxShadow: '0 0 20px var(--c-primary-bg)' } : {}),
                transition: 'background 0.2s, border-color 0.2s',
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
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2"
                  style={{ background: 'var(--c-primary)', color: '#fff' }}
                >
                  {u.displayName?.[0] || '?'}
                </div>
              )}

              <div className="text-[12px] font-semibold truncate w-full" style={{ color: 'var(--c-t1)' }}>
                {u.displayName?.split(' ')[0]}
                {isMe && <span className="text-[10px] ml-1" style={{ color: 'var(--c-t3)' }}>(you)</span>}
              </div>

              <div className="mt-2">
                <div className="text-[16px] font-bold" style={{ color: p.color }}>{u.totalPoints} pts</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{u.totalPredictions || 0} polls</div>
              </div>

              <TickX correct={u.correctPredictions || 0} wrong={wrong} />
            </div>
          );
        })}
      </div>

      {/* ── Ranks 4 and below ── */}
      {rest.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--c-border)', transition: 'border-color 0.2s' }}
        >
          {rest.map((u, i) => {
            const rank  = i + 4;
            const isMe  = u.uid === user?.uid;
            const wrong = (u.totalPredictions || 0) - (u.correctPredictions || 0);
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < rest.length - 1 ? '1px solid var(--c-border)' : 'none',
                  background: isMe ? 'var(--c-primary-bg)' : 'var(--c-card)',
                  transition: 'background 0.2s',
                }}
              >
                {/* Rank */}
                <div className="w-6 text-center text-[12px] font-bold flex-shrink-0" style={{ color: 'var(--c-t3)' }}>
                  {rank}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--c-primary)', color: '#fff' }}
                    >
                      {u.displayName?.[0] || '?'}
                    </div>
                  )}
                  <span
                    className="text-[13px] font-medium truncate"
                    style={{ color: isMe ? 'var(--c-primary)' : 'var(--c-t1)' }}
                  >
                    {u.displayName}
                    {isMe && <span className="text-[11px] ml-1" style={{ color: 'var(--c-t3)' }}>(you)</span>}
                  </span>
                </div>

                {/* Stats: ✓ wrong pts */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color: 'var(--c-green)' }}>
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15" />
                      <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {u.correctPredictions || 0}
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color: 'var(--c-red)' }}>
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15" />
                      <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {wrong}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
                    {u.totalPredictions || 0}p
                  </span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--c-gold)' }}>
                    {u.totalPoints}pt
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
