import { useEffect, useState } from 'react';
import { getMatches, getAllPredictions } from '../firebase/services';
import { normalizeTeamName } from '../utils/scoring';
import { useGroup } from '../contexts/GroupContext';

export default function MatchStats() {
  const { activeGroupId } = useGroup();
  const [matches, setMatches] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([getMatches(), getAllPredictions()]).then(([m, p]) => {
      setMatches(m);
      setAllPreds(p);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  const completed = matches
    .filter((m) => m.status === 'completed' && m.result?.winner)
    .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));

  const stats = completed.map((m) => {
    const preds = allPreds.filter((p) => p.matchId === m.id);
    const correct = preds.filter(
      (p) => normalizeTeamName(p.prediction) === normalizeTeamName(m.result.winner)
    ).length;
    const wrong = preds.length - correct;
    return { match: m, total: preds.length, correct, wrong };
  });

  const filtered =
    filter === 'everyone_wrong'
      ? stats.filter((s) => s.total > 0 && s.correct === 0)
      : filter === 'everyone_right'
      ? stats.filter((s) => s.total > 0 && s.wrong === 0)
      : stats;

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
          Match Stats
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
          {completed.length} completed matches · prediction accuracy per match
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        {[
          { id: 'all',           label: 'All' },
          { id: 'everyone_wrong', label: '❌ Everyone Wrong' },
          { id: 'everyone_right', label: '✅ Everyone Right' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap"
            style={filter === id
              ? { background: 'var(--c-card)', color: 'var(--c-t1)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
              : { color: 'var(--c-t3)', background: 'transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">🏆</span>
          <p className="text-[14px]" style={{ color: 'var(--c-t3)' }}>No matches found for this filter.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(({ match: m, total, correct, wrong }) => {
          const correctPct = total > 0 ? Math.round((correct / total) * 100) : 0;
          const allWrong = total > 0 && correct === 0;
          const allRight = total > 0 && wrong === 0;

          return (
            <div key={m.id} className="rounded-2xl p-4"
              style={{
                background: 'var(--c-card)',
                border: `1px solid ${allWrong ? 'var(--c-red)' : allRight ? 'var(--c-green)' : 'var(--c-border)'}`,
              }}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--c-surface)', color: 'var(--c-t3)' }}>
                      Match {m.matchNumber}
                    </span>
                    {m.group && (
                      <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
                        Group {m.group}
                      </span>
                    )}
                    {allWrong && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--c-red)' }}>
                        Everyone wrong!
                      </span>
                    )}
                    {allRight && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--c-green)' }}>
                        Everyone right!
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[15px] font-semibold truncate" style={{ color: 'var(--c-t1)' }}>
                    {m.homeTeam} vs {m.awayTeam}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--c-t3)' }}>
                    Result:{' '}
                    <span className="font-semibold" style={{ color: 'var(--c-primary)' }}>
                      {m.result.winner}
                    </span>
                  </div>
                </div>

                {/* Accuracy badge */}
                <div className="flex-shrink-0 text-center">
                  <div className="text-[20px] font-black"
                    style={{ color: correctPct >= 50 ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {correctPct}%
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--c-t3)' }}>accuracy</div>
                </div>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div className="rounded-full overflow-hidden h-2 mb-3"
                  style={{ background: 'var(--c-surface)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${correctPct}%`,
                      background: 'var(--c-green)',
                      minWidth: correct > 0 ? 4 : 0,
                    }}
                  />
                </div>
              )}

              {/* Count row */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[13px] font-bold"
                  style={{ color: 'var(--c-green)' }}>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.2" />
                    <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {correct} correct
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-bold"
                  style={{ color: 'var(--c-red)' }}>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.2" />
                    <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {wrong} wrong
                </span>
                <span className="text-[12px] ml-auto" style={{ color: 'var(--c-t3)' }}>
                  {total} voted
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
