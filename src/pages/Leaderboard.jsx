import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, getGroups, getAllPredictions, getMatches } from '../firebase/services';
import LeaderboardTable from '../components/LeaderboardTable';
import { sortLeaderboard } from '../utils/scoring';

function GroupTrivia({ members, allPreds, allMatches }) {
  if (!members.length) return null;

  const memberIds = new Set(members.map((u) => u.uid || u.id));

  // Match map + majority per match
  const matchMap = {};
  allMatches.forEach((m) => { matchMap[m.id] = m; });

  const predCounts = {};
  allPreds.forEach((p) => {
    if (!predCounts[p.matchId]) predCounts[p.matchId] = {};
    predCounts[p.matchId][p.prediction] = (predCounts[p.matchId][p.prediction] || 0) + 1;
  });

  // Per-member stats
  const stats = {};
  members.forEach((u) => {
    const uid = u.uid || u.id;
    stats[uid] = { uid, name: u.displayName, nightOwl: 0, trigger: 0, contrarian: 0 };
  });

  // Earliest prediction per match (among ALL users)
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

    // Night owl
    const raw = p.predictionTime || p.timestamp;
    if (raw) {
      const t = raw.toDate ? raw.toDate() : new Date(raw);
      const h = t.getHours();
      if (h >= 22 || h < 6) s.nightOwl++;
    }
    // Trigger finger
    if (firstPred[p.matchId]?.uid === p.userId) s.trigger++;
    // Contrarian
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

  // Most popular team among group members (from ALL their predictions)
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
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allPreds, setAllPreds] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [activeGroup, setActiveGroup] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllUsers().then((all) => all.filter((u) => !u.hideFromLeaderboard)),
      getGroups(),
      getAllPredictions(),
      getMatches(),
    ]).then(([visibleUsers, allGroups, preds, matches]) => {
      setUsers(visibleUsers);
      setGroups(allGroups);
      setAllPreds(preds);
      setAllMatches(matches);
      setLoading(false);
    });
  }, []);

  const filteredUsers =
    activeGroup === 'all'
      ? users
      : users.filter((u) => (u.groupIds || []).includes(activeGroup));

  // Only show groups the current user belongs to or admins
  const currentUserData = users.find((u) => (u.uid || u.id) === user?.uid);
  const myGroupIds = new Set(currentUserData?.groupIds || []);
  const myGroups = groups.filter(
    (g) => myGroupIds.has(g.id) || (g.adminIds || []).includes(user?.uid)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
          Leaderboard
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
          Ranked by correct picks · accuracy · points
        </p>
      </div>

      {/* Group tabs — only groups the user belongs to or admins */}
      {myGroups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveGroup('all')}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
            style={activeGroup === 'all'
              ? { background: 'var(--c-primary)', color: '#fff' }
              : { background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}
          >
            All
          </button>
          {myGroups.map((g) => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={activeGroup === g.id
                ? { background: 'var(--c-primary)', color: '#fff' }
                : { background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}
            >
              {g.name}
            </button>
          ))}
          {/* Manage Members button — visible to group admins */}
          {activeGroup !== 'all' && (() => {
            const activeGroupObj = myGroups.find((g) => g.id === activeGroup);
            const canManage = (activeGroupObj?.adminIds || []).includes(user?.uid);
            return canManage ? (
              <Link to={`/group-admin/${activeGroup}`}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{ background: 'var(--c-gold-bg)', color: 'var(--c-gold)', border: '1px solid var(--c-gold-bd)' }}>
                ⚙️ Manage Members
              </Link>
            ) : null;
          })()}
        </div>
      )}

      <LeaderboardTable users={filteredUsers} />

      {/* Group trivia — only when a specific group is selected */}
      {activeGroup !== 'all' && (
        <GroupTrivia members={filteredUsers} allPreds={allPreds} allMatches={allMatches} />
      )}
    </div>
  );
}
