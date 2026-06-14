import { useEffect, useState } from 'react';
import {
  getAllUsers,
  updateUser,
  getUserPredictions,
  getMatches,
  deletePrediction,
  recalculateLeaderboard,
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

  // Detect duplicate predictions for the same match
  const matchCounts = {};
  predictions?.forEach((p) => {
    matchCounts[p.matchId] = (matchCounts[p.matchId] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="py-3 text-center text-xs text-gray-500">Loading predictions…</div>
    );
  }

  if (!predictions?.length) {
    return (
      <div className="py-3 text-center text-xs text-gray-600">No predictions yet.</div>
    );
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
            className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-xs ${
              isDuplicate
                ? 'bg-orange-950/30 border-orange-800'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            {/* Match info */}
            <div className="flex-1 min-w-0">
              {match ? (
                <>
                  <div className="text-white font-medium truncate">
                    {match.matchNumber != null && (
                      <span className="text-fifa-gold mr-1">#{match.matchNumber}</span>
                    )}
                    {getFlag(match.homeTeam)} {match.homeTeam} vs {getFlag(match.awayTeam)} {match.awayTeam}
                    {isDuplicate && <span className="ml-1 text-orange-400">⚠️ dup</span>}
                  </div>
                  <div className="text-gray-500 mt-0.5">{formatKickoff(match.kickoffTime)}</div>
                </>
              ) : (
                <div className="text-gray-600 italic">Match not found</div>
              )}
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-gray-400">Pick:</span>
                <span className="font-medium text-gray-200">{pred.prediction}</span>
                {status === 'correct' && <span className="text-green-400">✅</span>}
                {status === 'incorrect' && <span className="text-red-400">❌</span>}
                {status === 'pending' && <span className="text-gray-600">⏳</span>}
              </div>
              {pred.predictionTime && (
                <div className="text-gray-600 mt-0.5">
                  {formatKickoff(pred.predictionTime)}
                </div>
              )}
            </div>

            {/* Delete */}
            {isConfirming ? (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDelete(pred)}
                  disabled={isDeleting}
                  className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {isDeleting ? '…' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(pred.id)}
                className="flex-shrink-0 text-gray-600 hover:text-red-400 transition-colors px-1"
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
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [expandedUid, setExpandedUid] = useState(null);

  async function load() {
    const [allUsers, allMatches] = await Promise.all([getAllUsers(), getMatches()]);
    setUsers(sortLeaderboard(allUsers));
    const map = {};
    allMatches.forEach((m) => { map[m.id] = m; });
    setMatchMap(map);
    setLoading(false);
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
    return <div className="text-center py-8 text-gray-500">Loading…</div>;
  }

  const visible = users.filter((u) => !u.hideFromLeaderboard).length;
  const hidden = users.filter((u) => u.hideFromLeaderboard).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span className="text-green-400 font-medium">{visible} visible</span>
        <span>·</span>
        <span className="text-gray-500">{hidden} hidden</span>
        <span>·</span>
        <span className="text-xs">Click a user to see their predictions</span>
      </div>

      {users.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No users yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const uid = u.uid || u.id;
            const isHidden = !!u.hideFromLeaderboard;
            const isExpanded = expandedUid === uid;

            return (
              <div
                key={uid}
                className={`card transition-opacity ${isHidden ? 'opacity-50' : ''} ${
                  isExpanded ? 'border-blue-700' : ''
                }`}
              >
                {/* User row — clickable */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleExpand(uid)}
                >
                  {/* Avatar */}
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-9 h-9 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-fifa-blue flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {u.displayName?.[0] || '?'}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm truncate">{u.displayName}</span>
                      {u.isManual && (
                        <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">imported</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {u.email || 'No email'} · {u.correctPredictions ?? 0} correct · {u.totalPoints ?? 0} pts
                    </div>
                  </div>

                  {/* Expand chevron */}
                  <span className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▾
                  </span>

                  {/* Hide/Show toggle */}
                  <button
                    onClick={(e) => toggleHide(e, u)}
                    disabled={toggling === uid}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      isHidden
                        ? 'border-gray-600 text-gray-400 hover:border-green-600 hover:text-green-400'
                        : 'border-gray-600 text-gray-300 hover:border-red-600 hover:text-red-400'
                    } disabled:opacity-40`}
                  >
                    {toggling === uid ? '…' : isHidden ? '👁️ Show' : '🚫 Hide'}
                  </button>
                </div>

                {/* Expanded predictions panel */}
                {isExpanded && (
                  <div className="mt-3 border-t border-gray-800 pt-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Predictions
                    </div>
                    <UserPredictions
                      uid={uid}
                      matchMap={matchMap}
                      onDeleted={load}
                    />
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
