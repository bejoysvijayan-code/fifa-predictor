import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getUser, updateUserProfile, getUserPredictions, getMatches, getAllPredictions, getGroups, getHouses,
} from '../firebase/services';
import { getPredictionStatus, getFlag } from '../utils/scoring';

// ── Badge computation ──────────────────────────────────
function computeBadges(userPreds, allMatches, allPreds, uid) {
  const matchMap = {};
  allMatches.forEach((m) => { matchMap[m.id] = m; });

  const predCounts = {};
  allPreds.forEach((p) => {
    if (!predCounts[p.matchId]) predCounts[p.matchId] = {};
    predCounts[p.matchId][p.prediction] = (predCounts[p.matchId][p.prediction] || 0) + 1;
  });

  const firstPred = {};
  allPreds.forEach((p) => {
    if (!p.predictionTime) return;
    const t = p.predictionTime.toDate ? p.predictionTime.toDate() : new Date(p.predictionTime);
    if (!firstPred[p.matchId] || t < firstPred[p.matchId].time) {
      firstPred[p.matchId] = { uid: p.userId, time: t };
    }
  });

  const sorted = [...userPreds]
    .filter((p) => matchMap[p.matchId])
    .sort((a, b) => (matchMap[a.matchId]?.matchNumber ?? 999) - (matchMap[b.matchId]?.matchNumber ?? 999));

  let maxStreak = 0, cur = 0;
  sorted.forEach((p) => {
    const m = matchMap[p.matchId];
    if (!m || m.status !== 'completed' || !m.result) return;
    if (p.prediction === m.result.winner) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  });

  let contrarian = 0;
  userPreds.forEach((p) => {
    const counts = predCounts[p.matchId];
    if (!counts) return;
    const majority = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (majority && p.prediction !== majority) contrarian++;
  });

  let nightOwl = 0;
  userPreds.forEach((p) => {
    const raw = p.predictionTime || p.timestamp;
    if (!raw) return;
    const t = raw.toDate ? raw.toDate() : new Date(raw);
    const h = t.getHours();
    if (h >= 22 || h < 6) nightOwl++;
  });

  let triggerFinger = 0;
  userPreds.forEach((p) => {
    if (firstPred[p.matchId]?.uid === uid) triggerFinger++;
  });

  return { maxStreak, contrarian, nightOwl, triggerFinger };
}

const BADGE_DEFS = [
  { key: 'maxStreak',     emoji: '🔥', label: 'Longest Streak',  unit: (v) => `${v} correct in a row`,   desc: 'Most consecutive correct predictions' },
  { key: 'contrarian',   emoji: '🦅', label: 'Contrarian',       unit: (v) => `${v} against the crowd`,  desc: 'Picked against the majority vote' },
  { key: 'nightOwl',     emoji: '🌙', label: 'Night Owl',        unit: (v) => `${v} late-night picks`,   desc: 'Predictions made between 10 PM – 6 AM' },
  { key: 'triggerFinger',emoji: '⚡', label: 'Trigger Finger',   unit: (v) => `First in ${v} matches`,  desc: 'Was the first to predict in a match' },
];

function Field({ label, value, onChange, type = 'text', readOnly = false, placeholder = '' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className="rounded-xl px-3 py-2.5 text-[13px]"
        style={{
          background: readOnly ? 'var(--c-surface)' : 'var(--c-input)',
          border: '1px solid var(--c-border)',
          color: readOnly ? 'var(--c-t3)' : 'var(--c-t1)',
          outline: 'none',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { uid: paramUid } = useParams();
  const isOwn = !paramUid || paramUid === user?.uid;
  const targetUid = isOwn ? user?.uid : paramUid;

  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState(null);
  const [preds, setPreds] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedStat, setSelectedStat] = useState(null);
  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [favoritePlayer, setFavoritePlayer] = useState('');

  useEffect(() => {
    if (!targetUid) return;
    const needsAccessCheck = !isOwn && !user?.isAdmin;
    Promise.all([
      getUser(targetUid),
      getUserPredictions(targetUid),
      getMatches(),
      getAllPredictions(),
      needsAccessCheck ? getUser(user.uid) : Promise.resolve(null),
      needsAccessCheck ? getGroups() : Promise.resolve([]),
    ]).then(([userData, userPreds, allMatches, allPreds, meData, allGroups]) => {
      if (needsAccessCheck) {
        const targetGroups = new Set(userData?.groupIds || []);
        const myMemberGroups = new Set(meData?.groupIds || []);
        const myAdminGroups = new Set(
          allGroups.filter((g) => (g.adminIds || []).includes(user.uid)).map((g) => g.id)
        );
        const myEffective = new Set([...myMemberGroups, ...myAdminGroups]);
        if (![...targetGroups].some((gid) => myEffective.has(gid))) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }
      setProfile(userData);
      setName(userData?.displayName || '');
      setPhone(userData?.phone || '');
      setFavoriteTeam(userData?.favoriteTeam || '');
      setFavoritePlayer(userData?.favoritePlayer || '');
      setBadges(computeBadges(userPreds, allMatches, allPreds, targetUid));
      setPreds(userPreds);
      setMatches(allMatches);
      setLoading(false);
      if (userData?.houseId) {
        getHouses().then((hs) => setHouse(hs.find((h) => h.id === userData.houseId) || null));
      }
    });
  }, [targetUid]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateUserProfile(user.uid, { displayName: name.trim(), phone, favoriteTeam, favoritePlayer });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-4xl">🔒</span>
        <p className="text-[14px]" style={{ color: 'var(--c-t2)' }}>You don't share a group with this user.</p>
      </div>
    );
  }

  const accuracy = profile?.accuracyPercentage ?? 0;
  const correct  = profile?.correctPredictions ?? 0;
  const total    = profile?.totalPredictions ?? 0;
  const points   = profile?.totalPoints ?? 0;
  const photoURL = isOwn ? user.photoURL : profile?.photoURL;
  const email    = isOwn ? user.email : profile?.email;

  return (
    <div className="max-w-xl mx-auto px-4 py-7 space-y-5 animate-fade-in">

      {/* ── Avatar + name ── */}
      <div className="flex flex-col items-center gap-3 py-4">
        {photoURL ? (
          <img src={photoURL} alt={name}
            className="w-20 h-20 rounded-full"
            style={{ border: '3px solid var(--c-primary)' }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{ background: 'var(--c-primary)', color: '#fff' }}>
            {name?.[0] || '?'}
          </div>
        )}
        <div className="text-center">
          <div className="text-[20px] font-bold" style={{ color: 'var(--c-t1)' }}>
            {name || 'Unknown'}
            {isOwn && <span className="text-[13px] font-normal ml-2" style={{ color: 'var(--c-t3)' }}>(you)</span>}
          </div>
          {email && <div className="text-[13px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{email}</div>}
          {favoriteTeam && (
            <div className="text-[12px] mt-1" style={{ color: 'var(--c-t2)' }}>
              Supports <strong style={{ color: 'var(--c-primary)' }}>{favoriteTeam}</strong>
              {favoritePlayer && <> · Fav player: <strong style={{ color: 'var(--c-primary)' }}>{favoritePlayer}</strong></>}
            </div>
          )}
          {house && (() => {
            const HOUSE_COLORS = {
              '#EF4444': { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)' },
              '#F59E0B': { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
              '#3B82F6': { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)' },
              '#10B981': { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
              '#8B5CF6': { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)' },
              '#F97316': { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
            };
            const cm = HOUSE_COLORS[house.color] || HOUSE_COLORS['#3B82F6'];
            return (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: cm.bg, color: house.color, border: `1px solid ${cm.border}` }}>
                {house.emoji || '🏠'} {house.name}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Polls', value: total },
          { label: 'Correct', value: correct },
          { label: 'Points', value: points },
          { label: 'Accuracy', value: `${accuracy}%` },
        ].map(({ label, value }) => {
          const active = selectedStat === label;
          return (
            <button key={label} onClick={() => setSelectedStat(active ? null : label)}
              className="rounded-2xl p-3 text-center transition-all"
              style={{
                background: active ? 'var(--c-primary-bg)' : 'var(--c-card)',
                border: `1px solid ${active ? 'var(--c-primary)' : 'var(--c-border)'}`,
                cursor: 'pointer',
              }}>
              <div className="text-[18px] font-bold" style={{ color: 'var(--c-primary)' }}>{value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: active ? 'var(--c-primary)' : 'var(--c-t3)' }}>{label}</div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{active ? '▲ hide' : '▼ view'}</div>
            </button>
          );
        })}
      </div>

      {/* ── Stat drill-down ── */}
      {selectedStat && (() => {
        const matchMap = Object.fromEntries(matches.map((m) => [m.id, m]));
        const sorted = [...preds]
          .filter((p) => matchMap[p.matchId])
          .sort((a, b) => (matchMap[a.matchId]?.matchNumber ?? 999) - (matchMap[b.matchId]?.matchNumber ?? 999));

        const filtered = selectedStat === 'Correct'
          ? sorted.filter((p) => getPredictionStatus(p.prediction, matchMap[p.matchId]) === 'correct')
          : sorted;

        const STATUS_STYLE = {
          correct:   { color: 'var(--c-green)',   bg: 'var(--c-green-bg)',   label: '✓ Correct' },
          incorrect: { color: 'var(--c-red)',     bg: 'var(--c-red-bg)',     label: '✗ Wrong' },
          pending:   { color: 'var(--c-t3)',      bg: 'var(--c-surface)',    label: '⏳ Pending' },
        };

        return (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>
                {selectedStat === 'Correct' ? 'Correct Predictions' : 'All Predictions'}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{filtered.length} entries</span>
            </div>
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-[13px]" style={{ color: 'var(--c-t3)' }}>No predictions yet</div>
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto" style={{ '--tw-divide-opacity': 1 }}>
                {filtered.map((p) => {
                  const match = matchMap[p.matchId];
                  const status = getPredictionStatus(p.prediction, match);
                  const s = STATUS_STYLE[status];
                  return (
                    <div key={p.id || p.matchId} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderTop: '1px solid var(--c-border)' }}>
                      <div className="flex-shrink-0 text-[11px] font-bold w-6 text-center"
                        style={{ color: 'var(--c-t3)' }}>
                        {match?.matchNumber ?? '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--c-t1)' }}>
                          {getFlag(match?.homeTeam)} {match?.homeTeam} vs {match?.awayTeam} {getFlag(match?.awayTeam)}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-t2)' }}>
                          Your pick: <strong>{p.prediction}</strong>
                          {match?.result?.winner && status !== 'pending' && (
                            <> · Result: <strong>{match.result.winner}</strong></>
                          )}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Edit profile (own only) ── */}
      {isOwn && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>Profile Info</div>
          <form onSubmit={handleSave} className="space-y-3">
            <Field label="Display Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <Field label="Email" value={user.email} readOnly />
            <Field label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
              type="tel" placeholder="+91 98765 43210" />
            <Field label="Favourite Team" value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value)}
              placeholder="e.g. Brazil" />
            <Field label="Favourite Player" value={favoritePlayer} onChange={(e) => setFavoritePlayer(e.target.value)}
              placeholder="e.g. Vinicius Jr" />
            <button type="submit" disabled={saving}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{ background: saved ? 'var(--c-green)' : 'var(--c-primary)', color: '#fff' }}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ── Badges ── */}
      {badges && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>Badges & Fun Stats</div>
          <div className="grid grid-cols-2 gap-3">
            {BADGE_DEFS.map(({ key, emoji, label, unit, desc }) => {
              const val = badges[key];
              const earned = val > 0;
              return (
                <div key={key} className="rounded-xl p-3 flex flex-col gap-1"
                  style={{
                    background: earned ? 'var(--c-primary-bg)' : 'var(--c-surface)',
                    border: `1px solid ${earned ? 'var(--c-primary-bd)' : 'var(--c-border)'}`,
                    opacity: earned ? 1 : 0.45,
                  }}>
                  <div className="text-2xl">{emoji}</div>
                  <div className="text-[12px] font-bold" style={{ color: earned ? 'var(--c-primary)' : 'var(--c-t2)' }}>
                    {label}
                  </div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>
                    {unit(val)}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--c-t3)' }}>{desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
