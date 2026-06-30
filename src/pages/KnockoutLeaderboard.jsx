import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, getAllPredictions, getMatches } from '../firebase/services';
import LeaderboardTable from '../components/LeaderboardTable';
import { normalizeTeamName } from '../utils/scoring';

const POINTS_PER_CORRECT = 4;

export default function KnockoutLeaderboard() {
  const [users, setUsers] = useState([]);
  const [preds, setPreds] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllUsers().then((all) => all.filter((u) => !u.hideFromLeaderboard)),
      getAllPredictions(),
      getMatches(),
    ]).then(([allUsers, allPreds, allMatches]) => {
      setUsers(allUsers);
      setPreds(allPreds);
      setMatches(allMatches);
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

  const knockoutMatches = matches.filter((m) => m.isKnockout);
  const knockoutIds = new Set(knockoutMatches.map((m) => m.id));
  const completedKnockout = knockoutMatches.filter((m) => m.status === 'completed' && m.result?.winner);
  const completedIds = new Set(completedKnockout.map((m) => m.id));

  const resultMap = {};
  completedKnockout.forEach((m) => { resultMap[m.id] = m.result.winner; });

  const kickoffMap = {};
  knockoutMatches.forEach((m) => {
    kickoffMap[m.id] = m.kickoffTime?.toDate ? m.kickoffTime.toDate() : m.kickoffTime ? new Date(m.kickoffTime) : null;
  });

  const knockoutPreds = preds.filter((p) => knockoutIds.has(p.matchId));

  const members = users.map((u) => {
    const uid = u.uid || u.id;
    const userPreds = knockoutPreds.filter((p) => p.userId === uid);

    let correctPredictions = 0;
    let totalPredictions = 0;
    let totalPoints = 0;
    let lateVotes = 0;

    userPreds.forEach((p) => {
      const kickoff = kickoffMap[p.matchId];
      const raw = p.predictionTime || p.timestamp;
      const predTime = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
      const isLate = !!(predTime && kickoff && predTime > kickoff);
      if (isLate) lateVotes++;

      if (!completedIds.has(p.matchId)) return;
      totalPredictions++;
      if (isLate) return;
      if (normalizeTeamName(resultMap[p.matchId]) === normalizeTeamName(p.prediction)) {
        correctPredictions++;
        totalPoints += POINTS_PER_CORRECT;
      }
    });

    return { ...u, totalPoints, correctPredictions, totalPredictions, lateVotes, currentStreak: 0 };
  }).filter((u) => (knockoutPreds.some((p) => (p.userId === (u.uid || u.id)))));

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
          🏆 Knockout League
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
          Round of 32 onward · {POINTS_PER_CORRECT} pts per correct pick · separate from the main leaderboard
        </p>
      </div>

      <LeaderboardTable users={members} />

      <Link to="/leaderboard"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-medium"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)', textDecoration: 'none' }}>
        ← Back to Main Leaderboard
      </Link>
    </div>
  );
}
