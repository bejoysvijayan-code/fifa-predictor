import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMatches, getUserPredictions } from '../firebase/services';
import { formatKickoff, getFlag, getPredictionStatus } from '../utils/scoring';

const FILTERS = ['all', 'correct', 'incorrect', 'pending'];

const STATUS_STYLE = {
  correct: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)', color: '#4ADE80', icon: '✓', label: '+3 pts' },
  incorrect: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', color: '#FF7676', icon: '✗', label: '0 pts' },
  pending: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.38)', icon: '⏳', label: 'Pending' },
};

export default function MyPredictions() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [allMatches, userPreds] = await Promise.all([
        getMatches(),
        getUserPredictions(user.uid),
      ]);
      const predMap = {};
      userPreds.forEach((p) => { predMap[p.matchId] = p; });
      const merged = allMatches
        .filter((m) => predMap[m.id])
        .map((m) => ({
          match: m,
          prediction: predMap[m.id],
          status: getPredictionStatus(predMap[m.id]?.prediction, m),
        }))
        .reverse();
      setItems(merged);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  const correct = items.filter((i) => i.status === 'correct').length;
  const total = items.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <h1 className="text-[26px] font-bold tracking-tight" style={{ color: '#E8EAFF' }}>
        My Predictions
      </h1>

      {total > 0 && (
        <>
          <div className="flex items-center gap-3 mt-1 mb-4">
            <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              <span style={{ color: '#4ADE80', fontWeight: '600' }}>{correct}</span> / {total} correct
            </span>
            <span style={{ color: 'rgba(255,255,255,0.14)' }}>·</span>
            <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
              <span style={{ color: '#8B9CFF', fontWeight: '600' }}>{accuracy}%</span> accuracy
            </span>
          </div>
          {/* Accuracy bar */}
          <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${accuracy}%`, background: 'linear-gradient(90deg, #5B6CF8, #4ADE80)' }}
            />
          </div>
        </>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-shrink-0 capitalize px-4 py-1.5 rounded-full text-[12px] font-medium transition-all"
            style={
              filter === f
                ? { background: 'rgba(91,108,248,0.18)', border: '1px solid rgba(91,108,248,0.35)', color: '#8B9CFF' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.38)' }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div
          className="rounded-2xl py-16 flex flex-col items-center gap-3"
          style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-4xl">📋</span>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.28)' }}>No predictions yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(({ match, prediction, status }) => {
            const s = STATUS_STYLE[status];
            const pick = prediction.prediction;
            const isTeam = pick === match.homeTeam || pick === match.awayTeam;
            return (
              <div
                key={match.id}
                className="rounded-2xl p-4"
                style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="text-[13px] font-semibold mb-1" style={{ color: '#E8EAFF' }}>
                  {getFlag(match.homeTeam)} {match.homeTeam}
                  <span className="mx-1.5 font-normal" style={{ color: 'rgba(255,255,255,0.22)' }}>vs</span>
                  {getFlag(match.awayTeam)} {match.awayTeam}
                </div>
                <div className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {formatKickoff(match.kickoffTime)}
                </div>
                <div
                  className="inline-flex items-center gap-2 text-[12px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                >
                  <span>{s.icon}</span>
                  <span>{isTeam ? `${getFlag(pick)} ${pick}` : '🤝 Draw'}</span>
                  <span className="opacity-60">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
