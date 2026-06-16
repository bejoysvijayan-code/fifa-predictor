import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getAllUsers, getAllPredictions, getMatches } from '../firebase/services';
import LeaderboardTable from '../components/LeaderboardTable';
import { sortLeaderboard } from '../utils/scoring';

function GroupTrivia({ members, allPreds, allMatches }) {
  if (!members.length) return null;

  const memberIds = new Set(members.map((u) => u.uid || u.id));

  const matchMap = {};
  allMatches.forEach((m) => { matchMap[m.id] = m; });

  const predCounts = {};
  allPreds.forEach((p) => {
    if (!predCounts[p.matchId]) predCounts[p.matchId] = {};
    predCounts[p.matchId][p.prediction] = (predCounts[p.matchId][p.prediction] || 0) + 1;
  });

  const stats = {};
  members.forEach((u) => {
    const uid = u.uid || u.id;
    stats[uid] = { uid, name: u.displayName, nightOwl: 0, trigger: 0, contrarian: 0 };
  });

  const firstPred = {};
  allPreds.forEach((p) => {
    if (!p.predictionTime) return;
    const t = p.predictionTime.toDate ? p.predictionTime.toDate() : new Date(p.predictionTime);
    if (!firstPred[p.matchId] || t < firstPred[p.matchId].time) {
      firstPred[p.matchId] = { uid: p.userId, time: t };
    }
  });

  allPreds.forEach((p) => {
    if (!memberIds.has(p.userId)) return;
    const s = stats[p.userId];
    if (!s) return;

    const raw = p.predictionTime || p.timestamp;
    if (raw) {
      const t = raw.toDate ? raw.toDate() : new Date(raw);
      const h = t.getHours();
      if (h >= 22 || h < 6) s.nightOwl++;
    }
    if (firstPred[p.matchId]?.uid === p.userId) s.trigger++;
    const counts = predCounts[p.matchId];
    if (counts) {
      const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (majority && p.prediction !== majority) s.contrarian++;
    }
  });

  const statList = Object.values(stats);

  function leader(key, format) {
    const top = [...statList].sort((a, b) => b[key] - a[key])[0];
    if (!top || top[key] === 0) return null;
    return { name: top.name?.split(' ')[0], value: format(top[key]) };
  }

  const teamVotes = {};
  allPreds.forEach((p) => {
    if (!memberIds.has(p.userId)) return;
    teamVotes[p.prediction] = (teamVotes[p.prediction] || 0) + 1;
  });
  const favTeam = Object.entries(teamVotes).sort((a, b) => b[1] - a[1])[0];

  const sorted = sortLeaderboard(members);
  const mostPolls = [...members].sort(
    (a, b) => (b.totalPredictions || 0) - (a.totalPredictions || 0)
  )[0];

  const triviaItems = [
    { emoji: '📊', label: 'Most Active', value: mostPolls ? `${mostPolls.displayName?.split(' ')[0]} (${mostPolls.totalPredictions || 0} polls)` : null },
    { emoji: '🎯', label: 'Top Accuracy', value: sorted[0] ? `${sorted[0].displayName?.split(' ')[0]} — ${sorted[0].accuracyPercentage ?? 0}%` : null },
    { emoji: '⚽', label: "Group's Favourite Team", value: favTeam ? `${favTeam[0]} (${favTeam[1]} picks)` : null },
    leader('nightOwl',   (v) => `${v} late-night pick${v > 1 ? 's' : ''}`) && { emoji: '🌙', label: 'Night Owl',      value: `${leader('nightOwl', (v) => v)?.name} — ${leader('nightOwl', (v) => `${v} after midnight`)?.value}` },
    leader('trigger',    (v) => `first in ${v} match${v > 1 ? 'es' : ''}`) && { emoji: '⚡', label: 'Trigger Finger', value: `${leader('trigger', (v) => v)?.name} — ${leader('trigger', (v) => `first in ${v}`)?.value}` },
    leader('contrarian', (v) => `${v} against crowd`)                       && { emoji: '🦅', label: 'Contrarian',     value: `${leader('contrarian', (v) => v)?.name} — ${leader('contrarian', (v) => `${v} picks against crowd`)?.value}` },
  ].filter(Boolean).filter((t) => t.value);

  if (!triviaItems.length) return null;

  return (
    <div className="mt-6 rounded-2xl p-5 space-y-3"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <div className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>Group Trivia</div>
      <div className="space-y-2">
        {triviaItems.map(({ emoji, label, value }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--c-surface)' }}>
            <span className="text-lg flex-shrink-0">{emoji}</span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>{label}</div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--c-t1)' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { activeGroup, activeGroupId } = useGroup();
  const [users, setUsers] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllUsers().then((all) => all.filter((u) => !u.hideFromLeaderboard)),
      getAllPredictions(),
      getMatches(),
    ]).then(([allUsers, preds, matches]) => {
      setUsers(allUsers);
      setAllPreds(preds);
      setAllMatches(matches);
      setLoading(false);
    });
  }, []);

  // Filter to active group's members (app admin with no group sees all)
  const groupMembers = activeGroupId
    ? users.filter((u) => (u.groupIds || []).includes(activeGroupId))
    : users;

  const isGroupAdmin = (activeGroup?.adminIds || []).includes(user?.uid);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
            Leaderboard
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
            {activeGroup ? activeGroup.name : 'All members'} · {groupMembers.length} player{groupMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isGroupAdmin && activeGroupId && (
          <Link to={`/group-admin/${activeGroupId}`}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium flex-shrink-0 mt-1"
            style={{ background: 'var(--c-gold-bg)', color: 'var(--c-gold)', border: '1px solid var(--c-gold-bd)' }}>
            ⚙️ Manage Members
          </Link>
        )}
      </div>

      <LeaderboardTable users={groupMembers} />

      <GroupTrivia members={groupMembers} allPreds={allPreds} allMatches={allMatches} />
    </div>
  );
}
