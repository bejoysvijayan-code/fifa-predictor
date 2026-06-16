import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getMatches, getUserPredictions, getAllPredictions, getGroupMembers } from '../firebase/services';
import MatchCard from '../components/MatchCard';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
];

export default function Matches() {
  const { user } = useAuth();
  const { activeGroupId } = useGroup();
  const [matches, setMatches] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [predCounts, setPredCounts] = useState({});
  const [groupMemberIds, setGroupMemberIds] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    const [allMatches, userPreds, allPredsData, groupMembers] = await Promise.all([
      getMatches(),
      getUserPredictions(user.uid),
      getAllPredictions(),
      activeGroupId ? getGroupMembers(activeGroupId) : Promise.resolve([]),
    ]);

    setMatches(allMatches);
    setPredictions(userPreds);
    setAllPreds(allPredsData);
    setGroupMemberIds(new Set(groupMembers.map((u) => u.uid || u.id)));

    const counts = {};
    allPredsData.forEach((p) => {
      if (!counts[p.matchId]) counts[p.matchId] = {};
      counts[p.matchId][p.prediction] = (counts[p.matchId][p.prediction] || 0) + 1;
    });
    setPredCounts(counts);

    setLoading(false);
  }

  useEffect(() => { load(); }, [activeGroupId]);

  const predMap = {};
  predictions.forEach((p) => { predMap[p.matchId] = p; });

  // Pre-compute: which matches have at least one prediction from a group member
  const matchHasGroupPred = {};
  if (activeGroupId) {
    allPreds.forEach((p) => {
      if (groupMemberIds.has(p.userId)) matchHasGroupPred[p.matchId] = true;
    });
  }

  // Group-scoped match list:
  // - upcoming/live: always show (global polls everyone can predict on)
  // - completed: show only if match is tagged to this group OR a group member predicted it
  const groupMatches = matches.filter((m) => {
    if (!activeGroupId) return true;
    if (m.status !== 'completed') return true;
    if ((m.groupIds || []).includes(activeGroupId)) return true;
    return !!matchHasGroupPred[m.id];
  });

  const counts = {
    all: groupMatches.length,
    upcoming: groupMatches.filter((m) => m.status === 'upcoming').length,
    live: groupMatches.filter((m) => m.status === 'live').length,
    completed: groupMatches.filter((m) => m.status === 'completed').length,
  };

  const filtered = filter === 'all' ? groupMatches : groupMatches.filter((m) => m.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <h1 className="text-[26px] font-bold tracking-tight mb-5" style={{ color: 'var(--c-t1)' }}>Matches</h1>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150"
              style={
                active
                  ? { background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }
                  : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }
              }
            >
              {label}
              {counts[id] > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'var(--c-primary-bd)' : 'var(--c-border)',
                    color: active ? 'var(--c-primary)' : 'var(--c-t3)',
                  }}
                >
                  {counts[id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl py-16 flex flex-col items-center gap-3"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}
        >
          <span className="text-4xl">🏟️</span>
          <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>
            No {filter !== 'all' ? filter : ''} matches found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} userPrediction={predMap[m.id]} predCounts={predCounts[m.id] || {}} onPredictionSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}
