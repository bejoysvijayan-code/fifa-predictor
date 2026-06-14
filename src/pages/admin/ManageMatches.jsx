import { useEffect, useState } from 'react';
import { getMatches, createMatch, updateMatch, deleteMatch } from '../../firebase/services';
import { Timestamp } from 'firebase/firestore';
import { formatKickoff, getFlag } from '../../utils/scoring';

const STATUS_OPTIONS = ['upcoming', 'live', 'completed'];

export default function ManageMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ matchNumber: '', homeTeam: '', awayTeam: '', kickoffTime: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // matchId awaiting confirm
  const [deleting, setDeleting] = useState(null);
  const [editingNum, setEditingNum] = useState(null); // { id, value }
  const [savingNum, setSavingNum] = useState(null);

  async function load() {
    const data = await getMatches();
    setMatches(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.homeTeam || !form.awayTeam || !form.kickoffTime) return;
    setSaving(true);
    try {
      await createMatch({
        matchNumber: form.matchNumber ? Number(form.matchNumber) : null,
        homeTeam: form.homeTeam.trim(),
        awayTeam: form.awayTeam.trim(),
        kickoffTime: Timestamp.fromDate(new Date(form.kickoffTime)),
      });
      setForm({ matchNumber: '', homeTeam: '', awayTeam: '', kickoffTime: '' });
      setMsg('Match created!');
      await load();
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function handleStatusChange(matchId, status) {
    await updateMatch(matchId, { status });
    await load();
  }

  async function handleSaveNum(matchId) {
    const num = editingNum.value.trim();
    if (num === '') return;
    setSavingNum(matchId);
    try {
      await updateMatch(matchId, { matchNumber: Number(num) });
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, matchNumber: Number(num) } : m)
      );
      setEditingNum(null);
    } finally {
      setSavingNum(null);
    }
  }

  async function handleDelete(matchId) {
    setDeleting(matchId);
    try {
      await deleteMatch(matchId);
      setConfirmDelete(null);
      await load();
    } finally {
      setDeleting(null);
    }
  }

  // Highlight duplicate matches (same homeTeam + awayTeam)
  const duplicateKeys = new Set();
  const seen = new Set();
  matches.forEach((m) => {
    const key = `${m.homeTeam}|${m.awayTeam}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Create Match</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Match Number</label>
            <input
              type="number"
              name="matchNumber"
              value={form.matchNumber}
              onChange={handleChange}
              placeholder="e.g. 1"
              min="1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Home Team</label>
              <input
                name="homeTeam"
                value={form.homeTeam}
                onChange={handleChange}
                placeholder="e.g. Brazil"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Away Team</label>
              <input
                name="awayTeam"
                value={form.awayTeam}
                onChange={handleChange}
                placeholder="e.g. Argentina"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Kickoff Date & Time</label>
            <input
              type="datetime-local"
              name="kickoffTime"
              value={form.kickoffTime}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-fifa-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Match'}
          </button>
          {msg && <p className="text-green-400 text-sm text-center">{msg}</p>}
        </form>
      </div>

      {/* Duplicates warning */}
      {duplicateKeys.size > 0 && (
        <div className="bg-orange-900/30 border border-orange-700 rounded-xl px-4 py-3 text-sm text-orange-300">
          ⚠️ {duplicateKeys.size} duplicate match{duplicateKeys.size > 1 ? 'es' : ''} detected — delete the extra one below.
        </div>
      )}

      {/* Matches list */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">All Matches ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No matches yet.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const isDuplicate = duplicateKeys.has(`${m.homeTeam}|${m.awayTeam}`);
              const isConfirming = confirmDelete === m.id;
              const isDeleting = deleting === m.id;

              const isEditingNum = editingNum?.id === m.id;

              return (
                <div
                  key={m.id}
                  className={`card flex items-center justify-between gap-3 ${
                    isDuplicate ? 'border-orange-700 bg-orange-950/20' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm flex items-center gap-1.5 flex-wrap">
                      {/* Inline match number editor */}
                      {isEditingNum ? (
                        <span className="flex items-center gap-1">
                          <span className="text-fifa-gold">#</span>
                          <input
                            type="number"
                            min="1"
                            value={editingNum.value}
                            onChange={(e) => setEditingNum({ id: m.id, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNum(m.id);
                              if (e.key === 'Escape') setEditingNum(null);
                            }}
                            autoFocus
                            className="w-16 bg-gray-800 border border-blue-500 rounded px-1.5 py-0.5 text-fifa-gold text-sm focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveNum(m.id)}
                            disabled={savingNum === m.id}
                            className="text-xs px-1.5 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                          >
                            {savingNum === m.id ? '…' : '✓'}
                          </button>
                          <button
                            onClick={() => setEditingNum(null)}
                            className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded"
                          >
                            ✕
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setEditingNum({ id: m.id, value: String(m.matchNumber ?? '') })}
                          className="flex items-center gap-1 group"
                          title="Click to edit match number"
                        >
                          <span className="text-fifa-gold">
                            {m.matchNumber != null ? `#${m.matchNumber}` : '#—'}
                          </span>
                          <span className="text-gray-600 group-hover:text-gray-400 text-xs">✏️</span>
                        </button>
                      )}
                      {getFlag(m.homeTeam)} {m.homeTeam} vs {getFlag(m.awayTeam)} {m.awayTeam}
                      {isDuplicate && (
                        <span className="text-xs text-orange-400 font-medium">⚠️ duplicate</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatKickoff(m.kickoffTime)}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    {/* Delete button — two-tap confirm */}
                    {isConfirming ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={isDeleting}
                          className="px-2 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? '…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(m.id)}
                        className="px-2 py-1.5 border border-gray-700 hover:border-red-600 text-gray-500 hover:text-red-400 text-xs rounded-lg transition-colors"
                        title="Delete match"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
