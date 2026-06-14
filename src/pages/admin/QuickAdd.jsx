import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { FIFA2026_SCHEDULE, FIFA2026_GROUPS } from '../../data/schedule2026';
import { getMatches, createMatch } from '../../firebase/services';
import { getFlag } from '../../utils/scoring';

const GROUP_COLORS = {
  A: 'bg-red-900/40 text-red-300 border-red-800',
  B: 'bg-orange-900/40 text-orange-300 border-orange-800',
  C: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  D: 'bg-green-900/40 text-green-300 border-green-800',
  E: 'bg-teal-900/40 text-teal-300 border-teal-800',
  F: 'bg-cyan-900/40 text-cyan-300 border-cyan-800',
  G: 'bg-blue-900/40 text-blue-300 border-blue-800',
  H: 'bg-indigo-900/40 text-indigo-300 border-indigo-800',
  I: 'bg-violet-900/40 text-violet-300 border-violet-800',
  J: 'bg-purple-900/40 text-purple-300 border-purple-800',
  K: 'bg-pink-900/40 text-pink-300 border-pink-800',
  L: 'bg-rose-900/40 text-rose-300 border-rose-800',
};

function formatUTC(utcString) {
  const d = new Date(utcString);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function QuickAdd() {
  const [existing, setExisting] = useState(new Set());
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState(new Set());
  const [filterGroup, setFilterGroup] = useState('All');
  const [filterMatchday, setFilterMatchday] = useState('All');
  const [search, setSearch] = useState('');

  async function loadExisting() {
    const matches = await getMatches();
    const keys = new Set(
      matches.map((m) => `${m.homeTeam}|${m.awayTeam}`)
    );
    setExisting(keys);
  }

  useEffect(() => { loadExisting(); }, []);

  async function handleAdd(match) {
    setAdding(match.matchNumber);
    try {
      await createMatch({
        matchNumber: match.matchNumber,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoffTime: Timestamp.fromDate(new Date(match.kickoffUTC)),
        group: match.group,
        matchday: match.matchday,
        venue: match.venue,
      });
      setAdded((prev) => new Set([...prev, `${match.homeTeam}|${match.awayTeam}`]));
    } finally {
      setAdding(null);
    }
  }

  async function handleAddAll() {
    const toAdd = filtered.filter((m) => !isAdded(m));
    for (const match of toAdd) {
      await handleAdd(match);
    }
  }

  function isAdded(match) {
    const key = `${match.homeTeam}|${match.awayTeam}`;
    return existing.has(key) || added.has(key);
  }

  const groups = ['All', ...Object.keys(FIFA2026_GROUPS)];
  const matchdays = ['All', '1', '2', '3'];

  const filtered = FIFA2026_SCHEDULE.filter((m) => {
    if (filterGroup !== 'All' && m.group !== filterGroup) return false;
    if (filterMatchday !== 'All' && String(m.matchday) !== filterMatchday) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.homeTeam.toLowerCase().includes(q) && !m.awayTeam.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const notAdded = filtered.filter((m) => !isAdded(m));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">FIFA 2026 Match Schedule</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              72 group stage matches · 12 groups · June 11 – June 27
            </p>
          </div>
          {notAdded.length > 0 && (
            <button
              onClick={handleAddAll}
              disabled={adding !== null}
              className="flex-shrink-0 px-3 py-2 bg-fifa-gold hover:bg-yellow-500 text-gray-900 text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              + Add All ({notAdded.length})
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team…"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 w-36"
          />
          <div className="flex gap-1 flex-wrap">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                  filterGroup === g
                    ? 'bg-fifa-blue border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {g === 'All' ? 'All Groups' : `Group ${g}`}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {matchdays.map((d) => (
              <button
                key={d}
                onClick={() => setFilterMatchday(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  filterMatchday === d
                    ? 'bg-gray-600 border-gray-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {d === 'All' ? 'All MD' : `MD${d}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No matches found.</p>
        ) : (
          filtered.map((match) => {
            const done = isAdded(match);
            return (
              <div
                key={match.matchNumber}
                className={`card flex items-center gap-3 transition-opacity ${done ? 'opacity-40' : ''}`}
              >
                {/* Match number + group */}
                <div className="flex flex-col items-center flex-shrink-0 w-14 text-center">
                  <span className="text-xs font-bold text-white">#{match.matchNumber}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border mt-0.5 ${GROUP_COLORS[match.group]}`}>
                    Grp {match.group}
                  </span>
                </div>

                {/* Teams */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                    <span>{getFlag(match.homeTeam)}</span>
                    <span className="truncate">{match.homeTeam}</span>
                    <span className="text-gray-500 text-xs">vs</span>
                    <span>{getFlag(match.awayTeam)}</span>
                    <span className="truncate">{match.awayTeam}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatUTC(match.kickoffUTC)} · {match.venue} · MD{match.matchday}
                  </div>
                </div>

                {/* Add button */}
                <button
                  onClick={() => !done && handleAdd(match)}
                  disabled={done || adding === match.matchNumber}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    done
                      ? 'border-green-700 text-green-500 cursor-default'
                      : adding === match.matchNumber
                      ? 'border-gray-700 text-gray-500 cursor-wait'
                      : 'border-blue-700 text-blue-400 hover:bg-blue-900/30'
                  }`}
                >
                  {done ? '✓ Added' : adding === match.matchNumber ? '…' : '+ Add'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
