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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [editingNum, setEditingNum] = useState(null);
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

  const duplicateKeys = new Set();
  const seen = new Set();
  matches.forEach((m) => {
    const key = `${m.homeTeam}|${m.awayTeam}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  });

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none";
  const inputStyle = {
    background: 'var(--c-inp)', border: '1px solid var(--c-inp-bd)',
    color: 'var(--c-inp-t)', transition: 'border-color 0.15s',
  };

  if (loading) {
    return <div className="text-center py-8" style={{ color: 'var(--c-t2)' }}>Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--c-t1)' }}>Create Match</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Match Number</label>
            <input type="number" name="matchNumber" value={form.matchNumber} onChange={handleChange}
              placeholder="e.g. 1" min="1" className={inputClass} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--c-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--c-inp-bd)')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Home Team</label>
              <input name="homeTeam" value={form.homeTeam} onChange={handleChange}
                placeholder="e.g. Brazil" className={inputClass} style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--c-primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--c-inp-bd)')}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Away Team</label>
              <input name="awayTeam" value={form.awayTeam} onChange={handleChange}
                placeholder="e.g. Argentina" className={inputClass} style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--c-primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--c-inp-bd)')}
              />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Kickoff Date & Time</label>
            <input type="datetime-local" name="kickoffTime" value={form.kickoffTime} onChange={handleChange}
              className={inputClass} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--c-primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--c-inp-bd)')}
            />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2 bg-fifa-blue font-semibold rounded-lg transition-colors disabled:opacity-50 text-white text-sm"
          >
            {saving ? 'Creating…' : 'Create Match'}
          </button>
          {msg && <p className="text-sm text-center" style={{ color: 'var(--c-green)' }}>{msg}</p>}
        </form>
      </div>

      {/* Duplicates warning */}
      {duplicateKeys.size > 0 && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--c-orange-bg)', border: '1px solid var(--c-orange-bd)', color: 'var(--c-orange)' }}
        >
          ⚠️ {duplicateKeys.size} duplicate match{duplicateKeys.size > 1 ? 'es' : ''} detected — delete the extra one below.
        </div>
      )}

      {/* Matches list */}
      <div>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--c-t1)' }}>All Matches ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--c-t2)' }}>No matches yet.</p>
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
                  className="card flex items-center justify-between gap-3"
                  style={isDuplicate ? {
                    borderColor: 'var(--c-orange-bd)',
                    background: 'var(--c-orange-bg)',
                  } : {}}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--c-t1)' }}>
                      {isEditingNum ? (
                        <span className="flex items-center gap-1">
                          <span style={{ color: 'var(--c-gold)' }}>#</span>
                          <input
                            type="number" min="1"
                            value={editingNum.value}
                            onChange={(e) => setEditingNum({ id: m.id, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNum(m.id);
                              if (e.key === 'Escape') setEditingNum(null);
                            }}
                            autoFocus
                            className="w-16 rounded px-1.5 py-0.5 text-sm focus:outline-none"
                            style={{
                              background: 'var(--c-inp)', border: '1px solid var(--c-primary)',
                              color: 'var(--c-gold)',
                            }}
                          />
                          <button onClick={() => handleSaveNum(m.id)} disabled={savingNum === m.id}
                            className="text-xs px-1.5 py-0.5 bg-blue-700 text-white rounded disabled:opacity-50">
                            {savingNum === m.id ? '…' : '✓'}
                          </button>
                          <button onClick={() => setEditingNum(null)}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--c-surface)', color: 'var(--c-t2)' }}>
                            ✕
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setEditingNum({ id: m.id, value: String(m.matchNumber ?? '') })}
                          className="flex items-center gap-1 group"
                          title="Click to edit match number"
                        >
                          <span style={{ color: 'var(--c-gold)' }}>
                            {m.matchNumber != null ? `#${m.matchNumber}` : '#—'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--c-t3)' }}>✏️</span>
                        </button>
                      )}
                      {getFlag(m.homeTeam)} {m.homeTeam} vs {getFlag(m.awayTeam)} {m.awayTeam}
                      {isDuplicate && (
                        <span className="text-xs font-medium" style={{ color: 'var(--c-orange)' }}>⚠️ duplicate</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--c-t2)' }}>{formatKickoff(m.kickoffTime)}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusChange(m.id, e.target.value)}
                      className="rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                      style={{
                        background: 'var(--c-inp)', border: '1px solid var(--c-inp-bd)',
                        color: 'var(--c-inp-t)',
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    {isConfirming ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(m.id)} disabled={isDeleting}
                          className="px-2 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                          {isDeleting ? '…' : 'Confirm'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1.5 text-xs rounded-lg"
                          style={{ background: 'var(--c-surface)', color: 'var(--c-t2)' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(m.id)}
                        className="px-2 py-1.5 text-xs rounded-lg transition-colors"
                        style={{ border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--c-red-bd)';
                          e.currentTarget.style.color = 'var(--c-red)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--c-border)';
                          e.currentTarget.style.color = 'var(--c-t3)';
                        }}
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
