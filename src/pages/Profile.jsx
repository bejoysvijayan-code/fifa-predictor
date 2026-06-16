import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUser, updateUserProfile, getUserPredictions, getMatches, getAllPredictions,
} from '../firebase/services';

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
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [favoritePlayer, setFavoritePlayer] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUser(user.uid),
      getUserPredictions(user.uid),
      getMatches(),
      getAllPredictions(),
    ]).then(([userData, userPreds, allMatches, allPreds]) => {
      setProfile(userData);
      setName(userData?.displayName || user.displayName || '');
      setPhone(userData?.phone || '');
      setFavoriteTeam(userData?.favoriteTeam || '');
      setFavoritePlayer(userData?.favoritePlayer || '');
      setBadges(computeBadges(userPreds, allMatches, allPreds, user.uid));
      setLoading(false);
    });
  }, [user]);

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

  const accuracy = profile?.accuracyPercentage ?? 0;
  const correct  = profile?.correctPredictions ?? 0;
  const total    = profile?.totalPredictions ?? 0;
  const points   = profile?.totalPoints ?? 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-7 space-y-5 animate-fade-in">

      {/* ── Avatar + name ── */}
      <div className="flex flex-col items-center gap-3 py-4">
        {user.photoURL ? (
          <img src={user.photoURL} alt={name}
            className="w-20 h-20 rounded-full"
            style={{ border: '3px solid var(--c-primary)' }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
            style={{ background: 'var(--c-primary)', color: '#fff' }}>
            {name?.[0] || '?'}
          </div>
        )}
        <div className="text-center">
          <div className="text-[20px] font-bold" style={{ color: 'var(--c-t1)' }}>{name || 'Your Profile'}</div>
          <div className="text-[13px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{user.email}</div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Polls', value: total },
          { label: 'Correct', value: correct },
          { label: 'Points', value: points },
          { label: 'Accuracy', value: `${accuracy}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-3 text-center"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <div className="text-[18px] font-bold" style={{ color: 'var(--c-primary)' }}>{value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Edit profile ── */}
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
