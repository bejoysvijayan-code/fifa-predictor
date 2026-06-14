import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMatches, getUserPredictions, getUser, getAllUsers } from '../firebase/services';
import { sortLeaderboard as sort } from '../utils/scoring';
import UserStatsCard from '../components/UserStatsCard';
import MatchCard from '../components/MatchCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [allMatches, userPreds, stats, allUsers] = await Promise.all([
      getMatches(),
      getUserPredictions(user.uid),
      getUser(user.uid),
      getAllUsers(),
    ]);
    setMatches(allMatches);
    setPredictions(userPreds);
    setUserStats(stats);
    const sorted = sort(allUsers.filter((u) => !u.hideFromLeaderboard));
    const idx = sorted.findIndex((u) => u.uid === user.uid);
    setRank(idx >= 0 ? idx + 1 : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const predMap = {};
  predictions.forEach((p) => { predMap[p.matchId] = p; });

  const upcoming = matches.filter((m) => m.status === 'upcoming').slice(0, 3);
  const live = matches.filter((m) => m.status === 'live');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  const firstName = user.displayName?.split(' ')[0] || 'there';

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 space-y-7 animate-fade-in">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Welcome back
          </p>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: '#E8EAFF' }}>
            {firstName} 👋
          </h1>
        </div>
        {rank != null && (
          <div
            className="rounded-2xl px-4 py-2.5 text-center"
            style={{
              background: 'rgba(240,180,41,0.10)',
              border: '1px solid rgba(240,180,41,0.22)',
            }}
          >
            <div className="text-xl font-bold" style={{ color: '#F0B429' }}>#{rank}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(240,180,41,0.55)' }}>
              Your Rank
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <UserStatsCard stats={userStats} rank={rank} />

      {/* Live matches */}
      {live.length > 0 && (
        <section className="animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
            />
            <h2 className="text-[15px] font-semibold" style={{ color: '#E8EAFF' }}>Live Now</h2>
          </div>
          <div className="space-y-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} userPrediction={predMap[m.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold" style={{ color: '#E8EAFF' }}>Upcoming Matches</h2>
          <Link
            to="/matches"
            className="text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{ color: '#8B9CFF' }}
          >
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div
            className="rounded-2xl py-12 flex flex-col items-center gap-2"
            style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-3xl">📅</span>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.28)' }}>No upcoming matches scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} userPrediction={predMap[m.id]} onPredictionSaved={load} />
            ))}
          </div>
        )}
      </section>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/leaderboard"
          className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, rgba(91,108,248,0.12), rgba(139,92,246,0.07))',
            border: '1px solid rgba(91,108,248,0.18)',
          }}
        >
          <span className="text-3xl">🏆</span>
          <span className="text-[13px] font-semibold" style={{ color: '#8B9CFF' }}>Leaderboard</span>
        </Link>
        <Link
          to="/my-predictions"
          className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, rgba(240,180,41,0.10), rgba(249,115,22,0.06))',
            border: '1px solid rgba(240,180,41,0.18)',
          }}
        >
          <span className="text-3xl">📋</span>
          <span className="text-[13px] font-semibold" style={{ color: '#F0B429' }}>My Predictions</span>
        </Link>
      </div>
    </div>
  );
}
