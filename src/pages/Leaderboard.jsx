import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getAllUsers, getAllPredictions, getMatches, getHouses } from '../firebase/services';
import LeaderboardTable from '../components/LeaderboardTable';
import { sortLeaderboard } from '../utils/scoring';

const HOUSE_COLORS = {
  '#EF4444': { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)' },
  '#F59E0B': { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
  '#3B82F6': { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)' },
  '#10B981': { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
  '#8B5CF6': { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)' },
  '#F97316': { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
};

function HouseLeaderboard({ members }) {
  const [houses, setHouses] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { getHouses().then(setHouses); }, []);

  if (!houses.length) return (
    <div className="rounded-2xl py-12 flex flex-col items-center gap-2"
      style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
      <span className="text-3xl">🏠</span>
      <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No houses created yet — set them up in Admin → Houses</p>
    </div>
  );

  const ranked = houses.map((h) => {
    const houseMembers = members.filter((u) => u.houseId === h.id);
    const totalPoints = houseMembers.reduce((sum, u) => sum + (u.totalPoints || 0), 0);
    const totalCorrect = houseMembers.reduce((sum, u) => sum + (u.correctPredictions || 0), 0);
    const sorted = sortLeaderboard(houseMembers);
    return { ...h, members: sorted, totalPoints, totalCorrect };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalCorrect - a.totalCorrect);

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-4">
      {ranked.map((h, i) => {
        const cm = HOUSE_COLORS[h.color] || HOUSE_COLORS['#3B82F6'];
        const isExpanded = expanded === h.id;
        return (
          <div key={h.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--c-card)', border: `1px solid ${i === 0 ? h.color : 'var(--c-border)'}` }}>
            <button className="w-full flex items-center gap-4 px-5 py-4 text-left"
              onClick={() => setExpanded(isExpanded ? null : h.id)}>
              <span className="text-2xl">{MEDALS[i] || `#${i + 1}`}</span>
              <span className="text-2xl">{h.emoji || '🏠'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold px-3 py-0.5 rounded-full"
                    style={{ background: cm.bg, color: h.color, border: `1px solid ${cm.border}` }}>
                    {h.name}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
                    {h.members.length} member{h.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[20px] font-black" style={{ color: h.color }}>{h.totalPoints}</div>
                <div className="text-[10px]" style={{ color: 'var(--c-t3)' }}>total pts</div>
              </div>
              <span style={{ color: 'var(--c-t3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </button>

            {isExpanded && h.members.length > 0 && (
              <div style={{ borderTop: '1px solid var(--c-border)' }}>
                {h.members.map((u, idx) => (
                  <div key={u.uid || u.id} className="flex items-center gap-3 px-5 py-2.5"
                    style={{ borderTop: idx > 0 ? '1px solid var(--c-border)' : 'none' }}>
                    <span className="text-[12px] font-bold w-5 text-center" style={{ color: 'var(--c-t3)' }}>
                      {idx + 1}
                    </span>
                    {u.photoURL ? (
                      <img src={u.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: h.color, color: '#fff' }}>
                        {u.displayName?.[0] || '?'}
                      </div>
                    )}
                    <Link to={`/profile/${u.uid || u.id}`}
                      className="flex-1 text-[13px] font-medium truncate hover:underline"
                      style={{ color: 'var(--c-t1)' }}>
                      {u.displayName}
                    </Link>
                    <span className="text-[12px] font-bold" style={{ color: h.color }}>
                      {u.totalPoints || 0} pts
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
                      {u.correctPredictions || 0} ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
            {isExpanded && h.members.length === 0 && (
              <div className="px-5 py-4 text-[13px]" style={{ color: 'var(--c-t3)', borderTop: '1px solid var(--c-border)' }}>
                No members assigned yet
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [view, setView] = useState('individual');

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

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        {[
          { id: 'individual', label: '👤 Individual' },
          { id: 'houses',     label: '🏠 Houses' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setView(id)}
            className="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            style={view === id
              ? { background: 'var(--c-card)', color: 'var(--c-t1)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
              : { color: 'var(--c-t3)', background: 'transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'individual' && (
        <>
          <LeaderboardTable users={groupMembers} />
          <GroupTrivia members={groupMembers} allPreds={allPreds} allMatches={allMatches} />
        </>
      )}

      {view === 'houses' && <HouseLeaderboard members={groupMembers} />}
    </div>
  );
}
