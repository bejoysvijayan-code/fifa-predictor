import { useEffect, useState } from 'react';
import { getAllUsers, getUserPredictions, getMatches, deletePrediction } from '../../firebase/services';
import { normalizeTeamName } from '../../utils/scoring';

function getPredTime(pred) {
  const ts = pred?.predictionTime || pred?.timestamp;
  if (!ts) return null;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
}

function getKickoffMs(m) {
  const ts = m?.kickoffTime;
  if (!ts) return null;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
}

export default function UserPollResults() {
  const [users, setUsers]         = useState([]);
  const [matches, setMatches]     = useState([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [preds, setPreds]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingPreds, setLoadingPreds] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [includeAll, setIncludeAll] = useState(false);
  const [deduping, setDeduping]   = useState(false);
  const [dedupeResult, setDedupeResult] = useState(null);

  useEffect(() => {
    Promise.all([getAllUsers(), getMatches()]).then(([u, m]) => {
      setUsers(u.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));
      setMatches(m.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedUid) { setPreds([]); return; }
    setLoadingPreds(true);
    getUserPredictions(selectedUid).then((p) => {
      setPreds(p);
      setLoadingPreds(false);
    });
  }, [selectedUid]);

  const selectedUser = users.find((u) => u.uid === selectedUid);

  const rows = matches
    .filter((m) => {
      const hasPred = preds.some((p) => p.matchId === m.id);
      if (!hasPred) return false;
      if (!includeAll && !m.result?.winner) return false;
      return true;
    })
    .map((m) => {
      const pred = preds.find((p) => p.matchId === m.id);
      const winner = m.result?.winner || null;
      const isCompleted = !!winner;

      // Late vote detection
      const predMs    = getPredTime(pred);
      const kickoffMs = getKickoffMs(m);
      const isLate = predMs !== null && kickoffMs !== null && predMs > kickoffMs;

      const isRight = isCompleted && !isLate
        ? normalizeTeamName(pred?.prediction) === normalizeTeamName(winner)
        : isCompleted && isLate
          ? normalizeTeamName(pred?.prediction) === normalizeTeamName(winner)
          : null;

      // For leaderboard-matching score: late votes don't count
      const countsForScore = isCompleted && !isLate && isRight;

      return { m, pred, winner, isCompleted, isLate, isRight, countsForScore };
    });

  const correctCount   = rows.filter((r) => r.countsForScore).length;
  const wrongCount     = rows.filter((r) => r.isCompleted && !r.isLate && r.isRight === false).length;
  const completedCount = rows.filter((r) => r.isCompleted && !r.isLate).length;
  const lateRows       = rows.filter((r) => r.isLate);
  const lateCount      = lateRows.length;

  // Compute duplicate groups for display
  const matchLookup = {};
  matches.forEach((m) => { matchLookup[m.id] = m; });

  const byName = {};
  preds.forEach((p) => {
    const m = matchLookup[p.matchId];
    if (!m) return;
    const key = `${m.homeTeam}|${m.awayTeam}`;
    if (!byName[key]) byName[key] = [];
    byName[key].push({ ...p, _match: m });
  });
  const byId = {};
  preds.forEach((p) => {
    if (!byId[p.matchId]) byId[p.matchId] = [];
    byId[p.matchId].push({ ...p, _match: matchLookup[p.matchId] });
  });

  // Build dupGroups: array of { label, preds sorted earliest-first }
  const dupGroups = [];
  const seen = new Set();
  [...Object.values(byName), ...Object.values(byId)].forEach((group) => {
    if (group.length <= 1) return;
    const key = group.map((p) => p.id).sort().join(',');
    if (seen.has(key)) return;
    seen.add(key);
    const sorted = [...group].sort((a, b) => (getPredTime(a) ?? Infinity) - (getPredTime(b) ?? Infinity));
    const m = sorted[0]._match;
    dupGroups.push({ label: `${m?.homeTeam} vs ${m?.awayTeam}`, preds: sorted });
  });
  const toDeleteIds = new Set(dupGroups.flatMap((g) => g.preds.slice(1).map((p) => p.id)));

  function buildCopyText() {
    const lines = rows
      .filter((r) => r.isCompleted)
      .map(({ m, pred, winner, isRight, isLate }) => {
        const label = isLate
          ? '⏰ Late (not counted)'
          : isRight ? '✅ Right' : '❌ Wrong';
        return `Match ${m.matchNumber ?? '?'} - ${m.homeTeam} vs ${m.awayTeam} - Your Pick - ${pred?.prediction ?? '?'} - Result - ${winner} - ${label}`;
      });

    if (!lines.length) return '';

    const summary = `\n📊 Score: ${correctCount} / ${completedCount} correct${lateCount > 0 ? ` (${lateCount} late vote${lateCount > 1 ? 's' : ''} not counted)` : ''}`;
    return lines.join('\n') + summary;
  }

  async function handleDedupe() {
    if (!selectedUid) return;
    setDeduping(true);
    setDedupeResult(null);

    const matchMap2 = {};
    matches.forEach((m) => { matchMap2[m.id] = m; });

    // Group 1: same matchId (exact duplicate documents)
    const byMatchId = {};
    preds.forEach((p) => {
      if (!byMatchId[p.matchId]) byMatchId[p.matchId] = [];
      byMatchId[p.matchId].push(p);
    });

    // Group 2: same match name across different matchIds
    // key = "homeTeam|awayTeam" (normalised)
    const byMatchName = {};
    preds.forEach((p) => {
      const m = matchMap2[p.matchId];
      if (!m) return;
      const key = `${m.homeTeam}|${m.awayTeam}`;
      if (!byMatchName[key]) byMatchName[key] = [];
      byMatchName[key].push(p);
    });

    const toDelete = new Set();

    // Exact matchId duplicates — keep earliest
    Object.values(byMatchId).forEach((group) => {
      if (group.length <= 1) return;
      const sorted = [...group].sort((a, b) => (getPredTime(a) ?? Infinity) - (getPredTime(b) ?? Infinity));
      sorted.slice(1).forEach((p) => toDelete.add(p.id));
    });

    // Cross-matchId duplicates for same match name — keep earliest
    Object.values(byMatchName).forEach((group) => {
      if (group.length <= 1) return;
      const sorted = [...group].sort((a, b) => (getPredTime(a) ?? Infinity) - (getPredTime(b) ?? Infinity));
      sorted.slice(1).forEach((p) => toDelete.add(p.id));
    });

    if (toDelete.size === 0) {
      setDedupeResult({ removed: 0 });
      setDeduping(false);
      return;
    }

    try {
      await Promise.all([...toDelete].map((id) => deletePrediction(id)));
      const fresh = await getUserPredictions(selectedUid);
      setPreds(fresh);
      setDedupeResult({ removed: toDelete.size });
    } catch (err) {
      console.error('Dedupe failed:', err);
      setDedupeResult({ error: err?.message || 'Something went wrong' });
    } finally {
      setDeduping(false);
    }
  }

  function handleCopy() {
    const text = buildCopyText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-5">

      {/* User selector */}
      <div>
        <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide"
          style={{ color: 'var(--c-t3)' }}>
          Select Member
        </label>
        <select
          value={selectedUid}
          onChange={(e) => setSelectedUid(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
            color: 'var(--c-t1)',
          }}>
          <option value="">— choose a member —</option>
          {users.map((u) => (
            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
          ))}
        </select>
      </div>

      {/* Options */}
      {selectedUid && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={includeAll}
            onChange={(e) => setIncludeAll(e.target.checked)}
            className="rounded" />
          <span className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
            Include pending matches (no result yet)
          </span>
        </label>
      )}

      {loadingPreds && (
        <div className="flex justify-center py-8"><div className="spinner" /></div>
      )}

      {/* Results table */}
      {!loadingPreds && selectedUid && rows.length > 0 && (
        <>
          {/* Summary + copy */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[14px] font-semibold" style={{ color: 'var(--c-t1)' }}>
              {selectedUser?.displayName} —&nbsp;
              <span style={{ color: 'var(--c-green)' }}>✅ {correctCount}</span>
              {' · '}
              <span style={{ color: 'var(--c-red)' }}>❌ {wrongCount}</span>
              {' · '}
              <span style={{ color: 'var(--c-t3)' }}>{completedCount} done</span>
              {lateCount > 0 && (
                <span className="ml-2 text-[12px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#F59E0B' }}>
                  ⏰ {lateCount} late
                </span>
              )}
            </div>
            <button onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: copied ? 'var(--c-green)' : 'var(--c-gold)',
                color: '#0F172A',
              }}>
              {copied ? '✅ Copied!' : '📋 Copy Results'}
            </button>
          </div>

          {/* Duplicate checker */}
          {(dupGroups.length > 0 || dedupeResult) && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(239,68,68,0.35)' }}>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.08)' }}>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--c-red)' }}>
                  {dedupeResult
                    ? dedupeResult.error
                      ? `❌ Error: ${dedupeResult.error}`
                      : dedupeResult.removed === 0
                        ? '✅ No duplicates found'
                        : `✅ Removed ${dedupeResult.removed} duplicate${dedupeResult.removed > 1 ? 's' : ''}`
                    : `⚠️ ${toDeleteIds.size} duplicate${toDeleteIds.size > 1 ? 's' : ''} detected across ${dupGroups.length} match${dupGroups.length > 1 ? 'es' : ''}`}
                </span>
                {dupGroups.length > 0 && (
                  <button onClick={handleDedupe} disabled={deduping}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0"
                    style={{ background: 'var(--c-red)', color: '#fff', opacity: deduping ? 0.6 : 1 }}>
                    {deduping ? 'Fixing…' : 'Fix Duplicates'}
                  </button>
                )}
              </div>

              {/* Per-match duplicate breakdown */}
              {dupGroups.map((grp, gi) => (
                <div key={gi} style={{ borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="px-4 py-2 text-[12px] font-semibold"
                    style={{ background: 'rgba(239,68,68,0.04)', color: 'var(--c-t2)' }}>
                    {grp.label} — {grp.preds.length} entries
                  </div>
                  {grp.preds.map((p, pi) => {
                    const isKeep = pi === 0;
                    const ts = getPredTime(p);
                    const timeStr = ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                    return (
                      <div key={p.id}
                        className="flex items-center gap-3 px-4 py-2 text-[12px]"
                        style={{
                          borderTop: '1px solid var(--c-border)',
                          background: isKeep ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                        }}>
                        <span className="flex-shrink-0 font-bold text-[11px]"
                          style={{ color: isKeep ? 'var(--c-green)' : 'var(--c-red)', minWidth: 48 }}>
                          {isKeep ? '✅ Keep' : '🗑️ Delete'}
                        </span>
                        <span style={{ color: 'var(--c-t2)' }}>
                          Pick: <strong style={{ color: 'var(--c-t1)' }}>{p.prediction}</strong>
                        </span>
                        <span className="ml-auto flex-shrink-0" style={{ color: 'var(--c-t3)' }}>
                          {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Late vote callout — per match detail */}
          {lateCount > 0 && (
            <div className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(251,191,36,0.35)' }}>
              <div className="px-4 py-2.5 text-[12px] font-semibold"
                style={{ background: 'rgba(251,191,36,0.1)', color: '#F59E0B' }}>
                ⏰ {lateCount} vote{lateCount > 1 ? 's' : ''} submitted after kickoff — not counted in leaderboard
              </div>
              {lateRows.map(({ m, pred, winner, isRight }) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-[13px]"
                  style={{ borderTop: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}>
                  <span className="flex-shrink-0 text-[11px] font-bold"
                    style={{ color: 'var(--c-t3)', minWidth: 28 }}>
                    M{m.matchNumber}
                  </span>
                  <span className="flex-1 min-w-0 font-medium truncate" style={{ color: 'var(--c-t1)' }}>
                    {m.homeTeam} vs {m.awayTeam}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--c-t2)' }}>
                    Picked: <strong style={{ color: '#F59E0B' }}>{pred?.prediction}</strong>
                  </span>
                  {winner && (
                    <span className="text-[12px]" style={{ color: 'var(--c-t3)' }}>
                      → {winner}
                    </span>
                  )}
                  <span className="flex-shrink-0 text-[12px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: isRight ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: isRight ? 'var(--c-green)' : 'var(--c-red)',
                    }}>
                    {isRight ? '✅ Would be right' : '❌ Would be wrong'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--c-border)' }}>
            {rows.map(({ m, pred, winner, isCompleted, isLate, isRight }, i) => (
              <div key={m.id}
                className="flex items-center gap-3 px-4 py-3 text-[13px]"
                style={{
                  background: isLate
                    ? 'rgba(251,191,36,0.06)'
                    : i % 2 === 0 ? 'var(--c-card)' : 'var(--c-surface)',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--c-border)' : 'none',
                }}>
                {/* Match number */}
                <span className="flex-shrink-0 w-8 text-[11px] font-bold text-center"
                  style={{ color: 'var(--c-t3)' }}>
                  M{m.matchNumber ?? '?'}
                </span>

                {/* Match name */}
                <span className="flex-1 min-w-0 font-medium truncate" style={{ color: 'var(--c-t1)' }}>
                  {m.homeTeam} vs {m.awayTeam}
                </span>

                {/* Pick */}
                <span className="flex-shrink-0 text-[12px] px-2 py-0.5 rounded-lg"
                  style={{ background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}>
                  {pred?.prediction ?? '?'}
                </span>

                {/* Result */}
                {isCompleted ? (
                  <span className="flex-shrink-0 text-[12px] font-bold"
                    style={{ color: 'var(--c-t3)' }}>
                    → {winner}
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--c-t3)' }}>Pending</span>
                )}

                {/* Status */}
                <span className="flex-shrink-0 text-[13px]">
                  {isLate
                    ? <span title="Late vote — not counted" style={{ color: '#F59E0B' }}>⏰</span>
                    : isRight === true ? '✅'
                    : isRight === false ? '❌'
                    : '⏳'}
                </span>
              </div>
            ))}
          </div>

          {/* Copy preview */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: 'var(--c-t3)' }}>
              Copy preview
            </div>
            <pre className="rounded-xl px-4 py-3 text-[11px] leading-6 whitespace-pre-wrap break-words overflow-auto max-h-48"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-t2)',
                fontFamily: 'inherit',
              }}>
              {buildCopyText() || '—'}
            </pre>
          </div>
        </>
      )}

      {!loadingPreds && selectedUid && rows.length === 0 && preds.length > 0 && (
        <div className="text-center py-10 text-[14px]" style={{ color: 'var(--c-t3)' }}>
          No completed matches with predictions yet.
        </div>
      )}

      {!loadingPreds && selectedUid && preds.length === 0 && (
        <div className="text-center py-10 text-[14px]" style={{ color: 'var(--c-t3)' }}>
          No predictions found for this member.
        </div>
      )}
    </div>
  );
}
