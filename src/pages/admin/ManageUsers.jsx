import { useEffect, useState } from 'react';
import {
  getAllUsers,
  updateUser,
  getUserPredictions,
  getMatches,
  deletePrediction,
  recalculateLeaderboard,
  getGroups,
  assignUserToGroup,
  removeUserFromGroup,
  mergeUsers,
} from '../../firebase/services';
import { sortLeaderboard, getFlag, formatKickoff, getPredictionStatus } from '../../utils/scoring';

function UserPredictions({ uid, matchMap, onDeleted }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    getUserPredictions(uid).then((preds) => {
      setPredictions(preds.sort((a, b) => {
        const ma = matchMap[a.matchId];
        const mb = matchMap[b.matchId];
        return (ma?.matchNumber ?? 999) - (mb?.matchNumber ?? 999);
      }));
      setLoading(false);
    });
  }, [uid]);

  async function handleDelete(pred) {
    setDeleting(pred.id);
    try {
      await deletePrediction(pred.id);
      await recalculateLeaderboard();
      setPredictions((prev) => prev.filter((p) => p.id !== pred.id));
      setConfirmDelete(null);
      onDeleted();
    } finally {
      setDeleting(null);
    }
  }

  const matchCounts = {};
  predictions?.forEach((p) => {
    matchCounts[p.matchId] = (matchCounts[p.matchId] || 0) + 1;
  });

  if (loading) {
    return <div className="py-3 text-center text-xs" style={{ color: 'var(--c-t2)' }}>Loading predictions…</div>;
  }

  if (!predictions?.length) {
    return <div className="py-3 text-center text-xs" style={{ color: 'var(--c-t3)' }}>No predictions yet.</div>;
  }

  return (
    <div className="space-y-1.5 mt-2">
      {predictions.map((pred) => {
        const match = matchMap[pred.matchId];
        const isDuplicate = matchCounts[pred.matchId] > 1;
        const status = match ? getPredictionStatus(pred.prediction, match) : 'pending';
        const isConfirming = confirmDelete === pred.id;
        const isDeleting = deleting === pred.id;

        return (
          <div
            key={pred.id}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background: isDuplicate ? 'var(--c-orange-bg)' : 'var(--c-surface)',
              border: `1px solid ${isDuplicate ? 'var(--c-orange-bd)' : 'var(--c-border)'}`,
            }}
          >
            {/* Match info */}
            <div className="flex-1 min-w-0">
              {match ? (
                <>
                  <div className="font-medium truncate" style={{ color: 'var(--c-t1)' }}>
                    {match.matchNumber != null && (
                      <span className="mr-1" style={{ color: 'var(--c-gold)' }}>#{match.matchNumber}</span>
                    )}
                    {getFlag(match.homeTeam)} {match.homeTeam} vs {getFlag(match.awayTeam)} {match.awayTeam}
                    {isDuplicate && <span className="ml-1" style={{ color: 'var(--c-orange)' }}>⚠️ dup</span>}
                  </div>
                  <div className="mt-0.5" style={{ color: 'var(--c-t3)' }}>{formatKickoff(match.kickoffTime)}</div>
                </>
              ) : (
                <div className="italic" style={{ color: 'var(--c-t3)' }}>Match not found</div>
              )}
              <div className="mt-0.5 flex items-center gap-1.5">
                <span style={{ color: 'var(--c-t2)' }}>Pick:</span>
                <span className="font-medium" style={{ color: 'var(--c-t1)' }}>{pred.prediction}</span>
                {status === 'correct'   && <span style={{ color: 'var(--c-green)' }}>✅</span>}
                {status === 'incorrect' && <span style={{ color: 'var(--c-red)' }}>❌</span>}
                {status === 'pending'   && <span style={{ color: 'var(--c-t3)' }}>⏳</span>}
              </div>
              {pred.predictionTime && (
                <div className="mt-0.5" style={{ color: 'var(--c-t3)' }}>
                  {formatKickoff(pred.predictionTime)}
                </div>
              )}
            </div>

            {/* Delete */}
            {isConfirming ? (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleDelete(pred)} disabled={isDeleting}
                  className="px-2 py-1 bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                  {isDeleting ? '…' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 text-xs rounded-lg"
                  style={{ background: 'var(--c-surface2)', color: 'var(--c-t2)' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(pred.id)}
                className="flex-shrink-0 px-1 transition-colors text-xs"
                style={{ color: 'var(--c-t3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--c-red)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-t3)')}
                title="Delete prediction"
              >
                🗑️
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [matchMap, setMatchMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [expandedUid, setExpandedUid] = useState(null);
  const [groupUpdating, setGroupUpdating] = useState(null);
  const [mergeUid, setMergeUid] = useState(null);
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeTarget, setMergeTarget] = useState(null);
  const [merging, setMerging] = useState(null);

  async function load() {
    const [allUsers, allMatches, allGroups] = await Promise.all([getAllUsers(), getMatches(), getGroups()]);
    setUsers(sortLeaderboard(allUsers));
    const map = {};
    allMatches.forEach((m) => { map[m.id] = m; });
    setMatchMap(map);
    setGroups(allGroups);
    setLoading(false);
  }

  async function handleMerge(sourceUid, targetUid) {
    setMerging(sourceUid);
    try {
      await mergeUsers(sourceUid, targetUid);
      setMergeTarget(null);
      setMergeSearch('');
      setMergeUid(null);
      setExpandedUid(null);
      await load();
    } catch (err) {
      alert('Merge failed: ' + err.message);
    } finally {
      setMerging(null);
    }
  }

  async function toggleGroup(uid, groupId, isCurrentlyIn) {
    setGroupUpdating(groupId + uid);
    if (isCurrentlyIn) {
      await removeUserFromGroup(uid, groupId);
    } else {
      await assignUserToGroup(uid, groupId);
    }
    setUsers((prev) =>
      prev.map((u) => {
        if ((u.uid || u.id) !== uid) return u;
        const current = u.groupIds || [];
        return {
          ...u,
          groupIds: isCurrentlyIn ? current.filter((g) => g !== groupId) : [...current, groupId],
        };
      })
    );
    setGroupUpdating(null);
  }

  useEffect(() => { load(); }, []);

  async function toggleHide(e, user) {
    e.stopPropagation();
    const uid = user.uid || user.id;
    setToggling(uid);
    const newValue = !user.hideFromLeaderboard;
    await updateUser(uid, { hideFromLeaderboard: newValue });
    setUsers((prev) =>
      prev.map((u) => (u.uid || u.id) === uid ? { ...u, hideFromLeaderboard: newValue } : u)
    );
    setToggling(null);
  }

  function toggleExpand(uid) {
    setExpandedUid((prev) => (prev === uid ? null : uid));
  }

  if (loading) {
    return <div className="text-center py-8" style={{ color: 'var(--c-t2)' }}>Loading…</div>;
  }

  const visible = users.filter((u) => !u.hideFromLeaderboard).length;
  const hidden  = users.filter((u) => u.hideFromLeaderboard).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--c-t2)' }}>
        <span className="font-medium" style={{ color: 'var(--c-green)' }}>{visible} visible</span>
        <span>·</span>
        <span>{hidden} hidden</span>
        <span>·</span>
        <span className="text-xs">Click a user to see their predictions</span>
      </div>

      {users.length === 0 ? (
        <p className="text-center py-8" style={{ color: 'var(--c-t2)' }}>No users yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const uid = u.uid || u.id;
            const isHidden   = !!u.hideFromLeaderboard;
            const isExpanded = expandedUid === uid;

            return (
              <div
                key={uid}
                className="card transition-opacity"
                style={{
                  opacity: isHidden ? 0.5 : 1,
                  ...(isExpanded ? { borderColor: 'var(--c-primary-bd)' } : {}),
                }}
              >
                {/* User row — clickable */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(uid)}>
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-fifa-blue flex items-center justify-center text-sm font-bold flex-shrink-0 text-white">
                      {u.displayName?.[0] || '?'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate" style={{ color: 'var(--c-t1)' }}>{u.displayName}</span>
                      {u.isManual && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--c-surface)', color: 'var(--c-t3)', border: '1px solid var(--c-border)' }}>
                          imported
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--c-t2)' }}>
                      {u.email || 'No email'} · {u.correctPredictions ?? 0} correct · {u.totalPoints ?? 0} pts
                    </div>
                  </div>

                  <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--c-t3)' }}>
                    ▾
                  </span>

                  <button
                    onClick={(e) => toggleHide(e, u)}
                    disabled={toggling === uid}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      border: '1px solid var(--c-border)',
                      color: isHidden ? 'var(--c-t2)' : 'var(--c-t2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isHidden ? 'var(--c-green-bd)' : 'var(--c-red-bd)';
                      e.currentTarget.style.color = isHidden ? 'var(--c-green)' : 'var(--c-red)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--c-border)';
                      e.currentTarget.style.color = 'var(--c-t2)';
                    }}
                  >
                    {toggling === uid ? '…' : isHidden ? '👁️ Show' : '🚫 Hide'}
                  </button>
                </div>

                {/* Expanded panel: groups + predictions */}
                {isExpanded && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--c-border)' }}>
                    {groups.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--c-t2)' }}>
                          Groups
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {groups.map((g) => {
                            const isMember = (u.groupIds || []).includes(g.id);
                            const isUpdating = groupUpdating === g.id + uid;
                            return (
                              <button
                                key={g.id}
                                disabled={isUpdating}
                                onClick={() => toggleGroup(uid, g.id, isMember)}
                                className="px-3 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-50"
                                style={
                                  isMember
                                    ? { background: 'var(--c-primary)', color: '#fff' }
                                    : { background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }
                                }
                              >
                                {isUpdating ? '…' : isMember ? `✓ ${g.name}` : `+ ${g.name}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* ── Merge ── */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t2)' }}>
                          Merge
                        </div>
                        {mergeUid !== uid && (
                          <button
                            onClick={() => { setMergeUid(uid); setMergeSearch(''); setMergeTarget(null); }}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}
                          >
                            🔀 Merge into another user…
                          </button>
                        )}
                      </div>

                      {mergeUid === uid && (
                        <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                          <p className="text-xs" style={{ color: 'var(--c-t2)' }}>
                            Pick the real account to keep. <strong style={{ color: 'var(--c-t1)' }}>{u.displayName}</strong>'s predictions will transfer to them, then this account is deleted.
                          </p>
                          <input
                            autoFocus
                            className="w-full rounded-lg px-3 py-2 text-xs"
                            style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}
                            placeholder="Search by name…"
                            value={mergeSearch}
                            onChange={(e) => { setMergeSearch(e.target.value); setMergeTarget(null); }}
                          />
                          {mergeSearch.trim().length > 0 && (
                            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
                              {users
                                .filter((other) => {
                                  const otherId = other.uid || other.id;
                                  return otherId !== uid && other.displayName?.toLowerCase().includes(mergeSearch.toLowerCase());
                                })
                                .slice(0, 5)
                                .map((other, idx, arr) => {
                                  const otherId = other.uid || other.id;
                                  const isSelected = mergeTarget?.id === otherId;
                                  return (
                                    <button
                                      key={otherId}
                                      onClick={() => setMergeTarget({ id: otherId, name: other.displayName })}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left"
                                      style={{
                                        background: isSelected ? 'var(--c-primary-bg)' : 'var(--c-card)',
                                        borderBottom: idx < arr.length - 1 ? '1px solid var(--c-border)' : 'none',
                                        color: isSelected ? 'var(--c-primary)' : 'var(--c-t1)',
                                      }}
                                    >
                                      {other.photoURL
                                        ? <img src={other.photoURL} className="w-5 h-5 rounded-full flex-shrink-0" alt="" />
                                        : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--c-primary)', color: '#fff' }}>{other.displayName?.[0]}</div>
                                      }
                                      <span className="flex-1 truncate">{other.displayName}</span>
                                      {other.isManual && <span style={{ color: 'var(--c-t3)' }}>imported</span>}
                                      {isSelected && <span style={{ color: 'var(--c-primary)' }}>✓</span>}
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                          {mergeTarget && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs flex-1" style={{ color: 'var(--c-t2)' }}>
                                Merge <strong style={{ color: 'var(--c-red)' }}>{u.displayName}</strong> → <strong style={{ color: 'var(--c-green)' }}>{mergeTarget.name}</strong>
                              </span>
                              <button
                                onClick={() => { setMergeUid(null); setMergeTarget(null); setMergeSearch(''); }}
                                className="px-2 py-1 text-xs rounded-lg"
                                style={{ background: 'var(--c-border)', color: 'var(--c-t1)' }}
                              >
                                Cancel
                              </button>
                              <button
                                disabled={merging === uid}
                                onClick={() => handleMerge(uid, mergeTarget.id)}
                                className="px-3 py-1 text-xs font-bold rounded-lg disabled:opacity-50"
                                style={{ background: '#EF4444', color: '#fff' }}
                              >
                                {merging === uid ? 'Merging…' : 'Confirm Merge'}
                              </button>
                            </div>
                          )}
                          {mergeTarget === null && (
                            <button
                              onClick={() => { setMergeUid(null); setMergeSearch(''); }}
                              className="text-xs"
                              style={{ color: 'var(--c-t3)' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--c-t2)' }}>
                      Predictions
                    </div>
                    <UserPredictions uid={uid} matchMap={matchMap} onDeleted={load} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
