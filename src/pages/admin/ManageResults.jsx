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
    await updateMatch(match.id, { result: { winner }, status: 'completed' });
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

  const btnStyle = {
    background: 'var(--c-surface)', border: '1px solid var(--c-border)',
    color: 'var(--c-t1)', borderRadius: 8, padding: '6px 12px',
    fontSize: 14, cursor: 'pointer', flex: 1, minWidth: 90,
    transition: 'border-color 0.15s',
  };

  if (loading) {
    return <div className="text-center py-8" style={{ color: 'var(--c-t2)' }}>Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Recalculate button */}
      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-semibold" style={{ color: 'var(--c-t1)' }}>Recalculate Leaderboard</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--c-t2)' }}>
            Recompute all user stats from completed match results.
          </div>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalcLoading}
          className="flex-shrink-0 px-4 py-2 bg-fifa-gold font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
          style={{ color: '#0F172A' }}
        >
          {recalcLoading ? 'Recalculating…' : '🔄 Recalculate'}
        </button>
      </div>

      {msg && (
        <div
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }}
        >
          {msg}
        </div>
      )}

      {/* Completed / Live matches */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--c-t1)' }}>Enter Results</h2>
        {matches.length === 0 ? (
          <div className="card text-center py-8" style={{ color: 'var(--c-t2)' }}>
            <p>No live or completed matches to manage.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--c-t3)' }}>
              Set a match to "live" or "completed" in the Matches tab first.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-sm" style={{ color: 'var(--c-t1)' }}>
                    {getFlag(m.homeTeam)} {m.homeTeam} vs {getFlag(m.awayTeam)} {m.awayTeam}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--c-t2)' }}>{formatKickoff(m.kickoffTime)}</div>
                </div>

                {m.result?.winner ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--c-green)' }}>
                      ✅ Result: <strong>{m.result.winner}</strong>
                    </span>
                    <button
                      onClick={() => setResult(m, null)}
                      className="text-xs hover:underline"
                      style={{ color: 'var(--c-red)' }}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setResult(m, m.homeTeam)} style={btnStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-bd)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-border)')}
                    >
                      {getFlag(m.homeTeam)} {m.homeTeam}
                    </button>
                    <button onClick={() => setResult(m, 'Draw')} style={{ ...btnStyle, minWidth: 60 }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-border-s)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-border)')}
                    >
                      🤝 Draw
                    </button>
                    <button onClick={() => setResult(m, m.awayTeam)} style={btnStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--c-primary-bd)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--c-border)')}
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
