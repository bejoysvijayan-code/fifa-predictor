import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMatches, getUserPredictions } from '../firebase/services';
import MatchCard from '../components/MatchCard';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
];

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    const [allMatches, userPreds] = await Promise.all([
      getMatches(),
      getUserPredictions(user.uid),
    ]);
    setMatches(allMatches);
    setPredictions(userPreds);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const predMap = {};
  predictions.forEach((p) => { predMap[p.matchId] = p; });

  const counts = {
    all: matches.length,
    upcoming: matches.filter((m) => m.status === 'upcoming').length,
    live: matches.filter((m) => m.status === 'live').length,
    completed: matches.filter((m) => m.status === 'completed').length,
  };

  const filtered = filter === 'all' ? matches : matches.filter((m) => m.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <h1 className="text-[26px] font-bold tracking-tight mb-5" style={{ color: '#E8EAFF' }}>Matches</h1>

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
                  ? { background: 'rgba(91,108,248,0.18)', border: '1px solid rgba(91,108,248,0.35)', color: '#8B9CFF' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)' }
              }
            >
              {label}
              {counts[id] > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'rgba(91,108,248,0.28)' : 'rgba(255,255,255,0.08)',
                    color: active ? '#8B9CFF' : 'rgba(255,255,255,0.32)',
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
          style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-4xl">🏟️</span>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            No {filter !== 'all' ? filter : ''} matches found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} userPrediction={predMap[m.id]} onPredictionSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}
