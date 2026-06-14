import { useEffect, useState } from 'react';
import { getMatches, updateMatch, recalculateLeaderboard } from '../../firebase/services';
import { formatKickoff, getFlag } from '../../utils/scoring';

export default function ManageResults() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const data = await getMatches();
    setMatches(data.filter((m) => m.status === 'completed' || m.status === 'live'));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setResult(match, winner) {
    await updateMatch(match.id, {
      result: { winner },
      status: 'completed',
    });
    flash(`Result set: ${winner}`);
    await load();
  }

  async function handleRecalculate() {
    setRecalcLoading(true);
    try {
      await recalculateLeaderboard();
      flash('Leaderboard recalculated!');
    } finally {
      setRecalcLoading(false);
    }
  }

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Recalculate button */}
      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-white">Recalculate Leaderboard</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Recompute all user stats from completed match results.
          </div>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalcLoading}
          className="flex-shrink-0 px-4 py-2 bg-fifa-gold hover:bg-yellow-500 text-gray-900 font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {recalcLoading ? 'Recalculating…' : '🔄 Recalculate'}
        </button>
      </div>

      {msg && (
        <div className="bg-green-900/30 border border-green-700 text-green-400 px-4 py-2 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* Completed / Live matches */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Enter Results</h2>
        {matches.length === 0 ? (
          <div className="card text-center text-gray-500 py-8">
            <p>No live or completed matches to manage.</p>
            <p className="text-xs mt-1">Set a match to "live" or "completed" in the Matches tab first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-white text-sm">
                    {getFlag(m.homeTeam)} {m.homeTeam} vs {getFlag(m.awayTeam)} {m.awayTeam}
                  </div>
                  <div className="text-xs text-gray-500">{formatKickoff(m.kickoffTime)}</div>
                </div>

                {m.result?.winner ? (
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 text-sm">
                      ✅ Result: <strong>{m.result.winner}</strong>
                    </span>
                    <button
                      onClick={() => setResult(m, null)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setResult(m, m.homeTeam)}
                      className="flex-1 min-w-[90px] py-1.5 px-3 bg-gray-800 hover:bg-blue-900 border border-gray-700 hover:border-blue-600 rounded-lg text-sm text-white transition-colors"
                    >
                      {getFlag(m.homeTeam)} {m.homeTeam}
                    </button>
                    <button
                      onClick={() => setResult(m, 'Draw')}
                      className="flex-1 min-w-[60px] py-1.5 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-colors"
                    >
                      🤝 Draw
                    </button>
                    <button
                      onClick={() => setResult(m, m.awayTeam)}
                      className="flex-1 min-w-[90px] py-1.5 px-3 bg-gray-800 hover:bg-blue-900 border border-gray-700 hover:border-blue-600 rounded-lg text-sm text-white transition-colors"
                    >
                      {getFlag(m.awayTeam)} {m.awayTeam}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
