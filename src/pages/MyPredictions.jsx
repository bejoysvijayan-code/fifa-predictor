import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getMatches, getUserPredictions, getAllPredictions, getGroupMembers } from '../firebase/services';
import { formatKickoff, getFlag, getPredictionStatus } from '../utils/scoring';

const FILTERS = ['all', 'correct', 'incorrect', 'pending'];

const STATUS_STYLE = {
  correct:   { bg: 'var(--c-green-bg)',  border: 'var(--c-green-bd)',  color: 'var(--c-green)',  icon: '✓', label: '+3 pts' },
  incorrect: { bg: 'var(--c-red-bg)',    border: 'var(--c-red-bd)',    color: 'var(--c-red)',    icon: '✗', label: '0 pts' },
  pending:   { bg: 'var(--c-surface)',   border: 'var(--c-border)',    color: 'var(--c-t2)',     icon: '⏳', label: 'Pending' },
};

export default function MyPredictions() {
  const { user } = useAuth();
  const { activeGroupId } = useGroup();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [allMatches, userPreds, allPreds, groupMembers] = await Promise.all([
        getMatches(),
        getUserPredictions(user.uid),
        getAllPredictions(),
        activeGroupId ? getGroupMembers(activeGroupId) : Promise.resolve([]),
      ]);

      // Pre-compute which matches have a group member prediction
      const groupMemberIds = new Set(groupMembers.map((u) => u.uid || u.id));
      const matchHasGroupPred = {};
      if (activeGroupId) {
        allPreds.forEach((p) => {
          if (groupMemberIds.has(p.userId)) matchHasGroupPred[p.matchId] = true;
        });
      }

      const predMap = {};
      userPreds.forEach((p) => { predMap[p.matchId] = p; });

      const merged = allMatches
        .filter((m) => {
          if (!predMap[m.id]) return false; // must have user's prediction
          if (!activeGroupId) return true;
          if (m.status !== 'completed') return true; // upcoming/live always shown
          if ((m.groupIds || []).includes(activeGroupId)) return true;
          return !!matchHasGroupPred[m.id];
        })
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
  }, [activeGroupId]);

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
      <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
        My Predictions
      </h1>

      {total > 0 && (
        <>
          <div className="flex items-center gap-3 mt-1 mb-4">
            <span className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
              <span style={{ color: 'var(--c-green)', fontWeight: '600' }}>{correct}</span> / {total} correct
            </span>
            <span style={{ color: 'var(--c-border-s)' }}>·</span>
            <span className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
              <span style={{ color: 'var(--c-primary)', fontWeight: '600' }}>{accuracy}%</span> accuracy
            </span>
          </div>
          {/* Accuracy bar */}
          <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--c-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${accuracy}%`, background: 'linear-gradient(90deg, var(--c-primary), var(--c-green))' }}
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
                ? { background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }
                : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }
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
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}
        >
          <span className="text-4xl">📋</span>
          <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No predictions yet</p>
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
                style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', transition: 'background 0.2s, border-color 0.2s' }}
              >
                <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--c-t1)' }}>
                  {getFlag(match.homeTeam)} {match.homeTeam}
                  <span className="mx-1.5 font-normal" style={{ color: 'var(--c-t3)' }}>vs</span>
                  {getFlag(match.awayTeam)} {match.awayTeam}
                </div>
                <div className="text-[11px] mb-3" style={{ color: 'var(--c-t3)' }}>
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
