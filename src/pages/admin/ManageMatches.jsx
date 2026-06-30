import { useEffect, useState } from 'react';
import { getMatches, createMatch, updateMatch, deleteMatch, getGroups } from '../../firebase/services';
import { Timestamp } from 'firebase/firestore';
import { formatKickoff, getFlag } from '../../utils/scoring';

const STATUS_OPTIONS = ['upcoming', 'live', 'completed'];

export default function ManageMatches() {
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ matchNumber: '', homeTeam: '', awayTeam: '', kickoffTime: '', isKnockout: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [editingNum, setEditingNum] = useState(null);
  const [savingNum, setSavingNum] = useState(null);
  const [editingTime, setEditingTime] = useState(null);
  const [savingTime, setSavingTime] = useState(null);
  const [togglingConfirm, setTogglingConfirm] = useState(null);

  async function load() {
    const [data, groupData] = await Promise.all([getMatches(), getGroups()]);
    setMatches(data);
    setGroups(groupData);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        isKnockout: form.isKnockout,
      });
      setForm({ matchNumber: '', homeTeam: '', awayTeam: '', kickoffTime: '', isKnockout: false });
      setMsg('Match created!');
      await load();
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function handleToggleKnockout(matchId, current) {
    await updateMatch(matchId, { isKnockout: !current });
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, isKnockout: !current } : m));
  }

  async function handleStatusChange(matchId, status) {
    await updateMatch(matchId, { status });
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status } : m));
  }

  async function handleGroupChange(matchId, groupId) {
    const groupIds = groupId ? [groupId] : [];
    await updateMatch(matchId, { groupIds });
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, groupIds } : m));
  }

  function toDatetimeLocal(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    // Format as YYYY-MM-DDTHH:mm in local time
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSaveTime(matchId) {
    if (!editingTime?.value) return;
    setSavingTime(matchId);
    try {
      const ts = Timestamp.fromDate(new Date(editingTime.value));
      await updateMatch(matchId, { kickoffTime: ts });
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, kickoffTime: ts } : m)
      );
      setEditingTime(null);
    } finally {
      setSavingTime(null);
    }
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

  async function handleToggleConfirmed(matchId, current) {
    setTogglingConfirm(matchId);
    try {
      await updateMatch(matchId, { detailsConfirmed: !current });
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, detailsConfirmed: !current } : m)
      );
    } finally {
      setTogglingConfirm(null);
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

  // Count untagged completed matches
  const untagged = matches.filter((m) => m.status === 'completed' && !(m.groupIds?.length));
  const unconfirmed = matches.filter((m) => !m.detailsConfirmed);

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
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-t2)' }}>
            <input type="checkbox" name="isKnockout" checked={form.isKnockout} onChange={handleChange} />
            🏆 Knockout League match
          </label>
          <button type="submit" disabled={saving}
            className="w-full py-2 bg-fifa-blue font-semibold rounded-lg transition-colors disabled:opacity-50 text-white text-sm"
          >
            {saving ? 'Creating…' : 'Create Match'}
          </button>
          {msg && <p className="text-sm text-center" style={{ color: 'var(--c-green)' }}>{msg}</p>}
        </form>
      </div>

      {/* Untagged warning */}
      {untagged.length > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--c-orange-bg)', border: '1px solid var(--c-orange-bd)', color: 'var(--c-orange)' }}>
          ⚠️ {untagged.length} completed match{untagged.length > 1 ? 'es have' : ' has'} no group assigned — use the group dropdown below to tag them.
        </div>
      )}

      {/* Unconfirmed warning */}
      {unconfirmed.length > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8' }}>
          🔲 {unconfirmed.length} match{unconfirmed.length > 1 ? 'es' : ''} not yet confirmed — verify match number & kickoff time, then click ✅ to mark as confirmed.
        </div>
      )}

      {/* Duplicates warning */}
      {duplicateKeys.size > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--c-orange-bg)', border: '1px solid var(--c-orange-bd)', color: 'var(--c-orange)' }}>
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
              const currentGroupId = m.groupIds?.[0] || '';
              const isUntagged = m.status === 'completed' && !currentGroupId;
              const isConfirmed = !!m.detailsConfirmed;

              return (
                <div key={m.id} className="card"
                  style={isDuplicate
                    ? { borderColor: 'var(--c-orange-bd)', background: 'var(--c-orange-bg)' }
                    : !isConfirmed
                    ? { borderColor: 'rgba(99,102,241,0.4)' }
                    : { borderColor: 'rgba(34,197,94,0.35)' }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
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
                              style={{ background: 'var(--c-inp)', border: '1px solid var(--c-primary)', color: 'var(--c-gold)' }}
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
                        {m.isKnockout && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--c-gold-bg)', color: 'var(--c-gold)', border: '1px solid var(--c-gold-bd)' }}>
                            🏆 Knockout
                          </span>
                        )}
                        {isDuplicate && (
                          <span className="text-xs font-medium" style={{ color: 'var(--c-orange)' }}>⚠️ duplicate</span>
                        )}
                      </div>
                      {editingTime?.id === m.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="datetime-local"
                            value={editingTime.value}
                            onChange={(e) => setEditingTime({ id: m.id, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTime(m.id);
                              if (e.key === 'Escape') setEditingTime(null);
                            }}
                            autoFocus
                            className="rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            style={{ background: 'var(--c-inp)', border: '1px solid var(--c-primary)', color: 'var(--c-inp-t)' }}
                          />
                          <button onClick={() => handleSaveTime(m.id)} disabled={savingTime === m.id}
                            className="text-xs px-1.5 py-0.5 bg-blue-700 text-white rounded disabled:opacity-50">
                            {savingTime === m.id ? '…' : '✓'}
                          </button>
                          <button onClick={() => setEditingTime(null)}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--c-surface)', color: 'var(--c-t2)' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingTime({ id: m.id, value: toDatetimeLocal(m.kickoffTime) })}
                          className="text-xs mt-0.5 flex items-center gap-1 group"
                          title="Click to edit kickoff time"
                          style={{ color: 'var(--c-t2)' }}
                        >
                          {formatKickoff(m.kickoffTime)}
                          <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Group tag */}
                      <select
                        value={currentGroupId}
                        onChange={(e) => handleGroupChange(m.id, e.target.value)}
                        className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        style={{
                          background: isUntagged ? 'var(--c-orange-bg)' : 'var(--c-inp)',
                          border: `1px solid ${isUntagged ? 'var(--c-orange-bd)' : 'var(--c-inp-bd)'}`,
                          color: isUntagged ? 'var(--c-orange)' : 'var(--c-inp-t)',
                          maxWidth: '110px',
                        }}
                        title="Assign to group"
                      >
                        <option value="">No group</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>

                      {/* Status */}
                      <select
                        value={m.status}
                        onChange={(e) => handleStatusChange(m.id, e.target.value)}
                        className="rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                        style={{ background: 'var(--c-inp)', border: '1px solid var(--c-inp-bd)', color: 'var(--c-inp-t)' }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      {/* Knockout League toggle */}
                      <button
                        onClick={() => handleToggleKnockout(m.id, !!m.isKnockout)}
                        title={m.isKnockout ? 'Knockout League match — click to unmark' : 'Mark as Knockout League match'}
                        className="px-2 py-1.5 text-xs rounded-lg font-medium transition-colors"
                        style={m.isKnockout
                          ? { background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-bd)', color: 'var(--c-gold)' }
                          : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}
                      >
                        🏆
                      </button>

                      {/* Confirm details */}
                      <button
                        onClick={() => handleToggleConfirmed(m.id, isConfirmed)}
                        disabled={togglingConfirm === m.id}
                        title={isConfirmed ? 'Details confirmed — click to unconfirm' : 'Click to confirm match number & kickoff time'}
                        className="px-2 py-1.5 text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                        style={isConfirmed
                          ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: 'var(--c-green)' }
                          : { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8' }}
                      >
                        {togglingConfirm === m.id ? '…' : isConfirmed ? '✅' : '🔲'}
                      </button>

                      {/* Delete */}
                      {isConfirming ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(m.id)} disabled={isDeleting}
                            className="px-2 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
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
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-red-bd)'; e.currentTarget.style.color = 'var(--c-red)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-t3)'; }}
                          title="Delete match"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
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
