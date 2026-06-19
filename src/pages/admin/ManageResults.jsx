import { useEffect, useState } from 'react';
import { getMatches, updateMatch, recalculateLeaderboard } from '../../firebase/services';
import { formatKickoff, getFlag } from '../../utils/scoring';

function ScoreEntry({ match, onSave }) {
  const [homeScore, setHomeScore] = useState(match.result?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(match.result?.awayScore ?? '');
  const [saving, setSaving] = useState(false);

  const homeNum = parseInt(homeScore, 10);
  const awayNum = parseInt(awayScore, 10);
  const scoresValid = !isNaN(homeNum) && !isNaN(awayNum) && homeNum >= 0 && awayNum >= 0;

  function autoWinner() {
    if (!scoresValid) return null;
    if (homeNum > awayNum) return match.homeTeam;
    if (awayNum > homeNum) return match.awayTeam;
    return 'Draw';
  }

  async function handleSave() {
    const winner = autoWinner();
    if (!winner) return;
    setSaving(true);
    try {
      await onSave(match, winner, homeNum, awayNum);
    } finally {
      setSaving(false);
    }
  }

  const inpStyle = {
    background: 'var(--c-inp)', border: '1px solid var(--c-inp-bd)',
    color: 'var(--c-inp-t)', borderRadius: 8, padding: '6px 0',
    fontSize: 18, fontWeight: 700, width: 56, textAlign: 'center', outline: 'none',
  };

  const predicted = autoWinner();

  return (
    <div>
      {/* Score inputs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--c-t2)' }}>
            {getFlag(match.homeTeam)} {match.homeTeam}
          </span>
          <input
            type="number" min="0" max="99"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            style={inpStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--c-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--c-inp-bd)')}
          />
        </div>
        <span className="font-bold" style={{ color: 'var(--c-t3)' }}>–</span>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="99"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            style={inpStyle}
            onFocus={(e) => (e.target.style.borderColor = 'var(--c-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--c-inp-bd)')}
          />
          <span className="text-sm font-medium" style={{ color: 'var(--c-t2)' }}>
            {getFlag(match.awayTeam)} {match.awayTeam}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={!scoresValid || saving}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 bg-fifa-blue text-white"
        >
          {saving ? 'Saving…' : 'Set Score'}
        </button>
      </div>

      {/* Auto-determined winner preview */}
      {predicted && scoresValid && (
        <p className="mt-2 text-xs" style={{ color: 'var(--c-t3)' }}>
          Auto winner →{' '}
          <span style={{ color: 'var(--c-green)', fontWeight: 600 }}>
            {predicted === 'Draw' ? '🤝 Draw' : `${getFlag(predicted)} ${predicted}`}
          </span>
        </p>
      )}
    </div>
  );
}

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

  async function handleSetScore(match, winner, homeScore, awayScore) {
    await updateMatch(match.id, {
      result: { winner, homeScore, awayScore },
      status: 'completed',
    });
    flash(`✅ Saved: ${match.homeTeam} ${homeScore} – ${awayScore} ${match.awayTeam}`);
    await load();
  }

  async function handleManualResult(match, winner) {
    await updateMatch(match.id, {
      result: { winner, homeScore: match.result?.homeScore ?? null, awayScore: match.result?.awayScore ?? null },
      status: 'completed',
    });
    flash(`Result set: ${winner}`);
    await load();
  }

  async function handleClear(match) {
    await updateMatch(match.id, { result: null });
    flash('Result cleared.');
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
    setTimeout(() => setMsg(''), 3500);
  }

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

      {/* Matches */}
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
              <div key={m.id} className="card space-y-4">
                {/* Match header */}
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm" style={{ color: 'var(--c-t1)' }}>
                    {getFlag(m.homeTeam)} {m.homeTeam} vs {getFlag(m.awayTeam)} {m.awayTeam}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--c-t2)' }}>{formatKickoff(m.kickoffTime)}</div>
                </div>

                {/* Current result */}
                {m.result?.winner && (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)' }}
                  >
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--c-green)' }}>
                        ✅ Winner: {m.result.winner === 'Draw' ? '🤝 Draw' : `${getFlag(m.result.winner)} ${m.result.winner}`}
                      </span>
                      {m.result.homeScore != null && m.result.awayScore != null && (
                        <span className="ml-2 text-sm font-black" style={{ color: 'var(--c-t1)' }}>
                          ({m.result.homeScore} – {m.result.awayScore})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleClear(m)}
                      className="text-xs hover:underline"
                      style={{ color: 'var(--c-red)' }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Score entry */}
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--c-t2)' }}>
                    Enter Score (auto-determines winner)
                  </div>
                  <ScoreEntry match={m} onSave={handleSetScore} />
                </div>


                {/* Manual fallback buttons */}
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--c-t3)' }}>
                    Or set winner manually:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[m.homeTeam, 'Draw', m.awayTeam].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleManualResult(m, opt)}
                        className="flex-1 min-w-[72px] py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          background: m.result?.winner === opt ? 'var(--c-primary-bg)' : 'var(--c-surface)',
                          border: `1px solid ${m.result?.winner === opt ? 'var(--c-primary-bd)' : 'var(--c-border)'}`,
                          color: m.result?.winner === opt ? 'var(--c-primary)' : 'var(--c-t2)',
                        }}
                      >
                        {opt === 'Draw' ? '🤝 Draw' : `${getFlag(opt)} ${opt}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
