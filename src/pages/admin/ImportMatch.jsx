import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  getMatches,
  importHistoricalMatch,
  addPredictionsToExistingMatch,
  recalculateLeaderboard,
} from '../../firebase/services';
import { getFlag, formatKickoff } from '../../utils/scoring';

const EMPTY_FORM = { matchNumber: '', homeTeam: '', awayTeam: '', kickoffTime: '', winner: '' };

function toDatetimeLocal(firestoreTs) {
  if (!firestoreTs) return '';
  const d = firestoreTs.toDate ? firestoreTs.toDate() : new Date(firestoreTs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ImportMatch() {
  const [existingMatches, setExistingMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [participants, setParticipants] = useState([]);
  const [newName, setNewName] = useState('');
  const [newPrediction, setNewPrediction] = useState('');
  const [newPredTime, setNewPredTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getMatches().then(setExistingMatches);
  }, []);

  function handleMatchSelect(e) {
    const id = e.target.value;
    setSelectedMatchId(id);
    setParticipants([]);
    if (!id) { setForm(EMPTY_FORM); setLocked(false); return; }
    const match = existingMatches.find((m) => m.id === id);
    if (!match) return;
    setForm({
      matchNumber: match.matchNumber ?? '',
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffTime: toDatetimeLocal(match.kickoffTime),
      winner: match.result?.winner ?? '',
    });
    setLocked(true);
  }

  function handleFormChange(e) {
    if (locked && ['matchNumber', 'homeTeam', 'awayTeam', 'kickoffTime'].includes(e.target.name)) return;
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addParticipant() {
    const name = newName.trim();
    if (!name || !newPrediction || !newPredTime) return;
    if (participants.find((p) => p.name.toLowerCase() === name.toLowerCase())) {
      flash({ text: `${name} already added.`, error: true }); return;
    }
    const kickoff = form.kickoffTime ? new Date(form.kickoffTime) : null;
    const predTime = new Date(newPredTime);
    const lateEntry = kickoff && predTime >= kickoff;
    setParticipants((prev) => [...prev, { name, prediction: newPrediction, predictionTime: newPredTime, lateEntry }]);
    setNewName(''); setNewPrediction(''); setNewPredTime('');
  }

  function removeParticipant(name) {
    setParticipants((prev) => prev.filter((p) => p.name !== name));
  }

  function updateParticipant(name, field, value) {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.name !== name) return p;
        const updated = { ...p, [field]: value };
        if (field === 'predictionTime') {
          const kickoff = form.kickoffTime ? new Date(form.kickoffTime) : null;
          updated.lateEntry = kickoff && new Date(value) >= kickoff;
        }
        return updated;
      })
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.homeTeam || !form.awayTeam || !form.kickoffTime || !form.winner) {
      flash({ text: 'Please fill in all match fields including the result.', error: true }); return;
    }
    setSaving(true);
    try {
      const kickoffTs = Timestamp.fromDate(new Date(form.kickoffTime));
      const participantPayload = participants.map((p) => ({
        name: p.name,
        prediction: p.prediction,
        predictionTime: p.predictionTime ? Timestamp.fromDate(new Date(p.predictionTime)) : null,
      }));
      if (selectedMatchId) {
        await addPredictionsToExistingMatch(selectedMatchId, kickoffTs, form.winner, participantPayload);
      } else {
        await importHistoricalMatch({
          matchNumber: form.matchNumber ? Number(form.matchNumber) : null,
          homeTeam: form.homeTeam.trim(),
          awayTeam: form.awayTeam.trim(),
          kickoffTime: kickoffTs,
          winner: form.winner,
          participants: participantPayload,
        });
      }
      await recalculateLeaderboard();
      const late = participants.filter((p) => p.lateEntry).length;
      const counted = participants.length - late;
      flash({ text: `✅ ${selectedMatchId ? 'Updated' : 'Imported'}! ${counted} prediction${counted !== 1 ? 's' : ''} saved${late > 0 ? `, ${late} skipped (after kickoff)` : ''}.` });
      setSelectedMatchId(''); setForm(EMPTY_FORM); setLocked(false); setParticipants([]);
      getMatches().then(setExistingMatches);
    } catch (err) {
      flash({ text: `Error: ${err.message}`, error: true });
    } finally {
      setSaving(false);
    }
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 6000); }

  const predictionOptions = form.homeTeam && form.awayTeam
    ? [form.homeTeam.trim(), 'Draw', form.awayTeam.trim()]
    : [];
  const lateCount = participants.filter((p) => p.lateEntry).length;

  const inpStyle = {
    background: 'var(--c-inp)', border: '1px solid var(--c-inp-bd)',
    color: 'var(--c-inp-t)', borderRadius: 8, padding: '8px 12px',
    fontSize: 14, width: '100%', outline: 'none',
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--c-t1)' }}>Import Match Predictions</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--c-t2)' }}>
          Select an existing match or enter a new one. Predictions after kickoff are saved but not scored.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select existing match */}
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
          >
            <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--c-gold)' }}>
              Load from Existing Match
            </label>
            <select value={selectedMatchId} onChange={handleMatchSelect} style={{ ...inpStyle, padding: '8px 12px' }}>
              <option value="">— Enter match details manually —</option>
              {existingMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.matchNumber ? `#${m.matchNumber} · ` : ''}{m.homeTeam} vs {m.awayTeam}
                  {m.result?.winner ? ` ✓ ${m.result.winner}` : ''}
                </option>
              ))}
            </select>
            {selectedMatchId && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--c-green)' }}>
                ✓ Match loaded — team names and kickoff time are auto-filled and locked.
              </p>
            )}
          </div>

          {/* Match details */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Match Number</label>
            <input type="number" name="matchNumber" value={form.matchNumber} onChange={handleFormChange}
              disabled={locked} placeholder="e.g. 1" min="1"
              style={{ ...inpStyle, opacity: locked ? 0.5 : 1 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Home Team</label>
              <input name="homeTeam" value={form.homeTeam} onChange={handleFormChange}
                disabled={locked} placeholder="e.g. Brazil"
                style={{ ...inpStyle, opacity: locked ? 0.5 : 1 }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Away Team</label>
              <input name="awayTeam" value={form.awayTeam} onChange={handleFormChange}
                disabled={locked} placeholder="e.g. Argentina"
                style={{ ...inpStyle, opacity: locked ? 0.5 : 1 }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Kickoff Date & Time</label>
            <input type="datetime-local" name="kickoffTime" value={form.kickoffTime} onChange={handleFormChange}
              disabled={locked} style={{ ...inpStyle, opacity: locked ? 0.5 : 1 }}
            />
          </div>

          {/* Result */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Result (Winner)</label>
            {predictionOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {predictionOptions.map((opt) => (
                  <button
                    key={opt} type="button"
                    onClick={() => setForm((prev) => ({ ...prev, winner: opt }))}
                    className="flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={
                      form.winner === opt
                        ? { background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }
                        : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }
                    }
                  >
                    {opt === 'Draw' ? '🤝 Draw' : `${getFlag(opt)} ${opt}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--c-t3)' }}>Enter both team names first</p>
            )}
          </div>

          {/* Participants */}
          <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t2)' }}>
                Participant Predictions ({participants.length})
              </label>
              {lateCount > 0 && (
                <span className="text-xs font-medium" style={{ color: 'var(--c-orange)' }}>
                  ⚠️ {lateCount} after kickoff
                </span>
              )}
            </div>

            {/* Add row */}
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                  placeholder="Participant name"
                  style={{ ...inpStyle, flex: 1, width: 'auto' }}
                />
                <select value={newPrediction} onChange={(e) => setNewPrediction(e.target.value)}
                  style={{ ...inpStyle, width: 'auto', padding: '8px' }}
                >
                  <option value="">Pick</option>
                  {predictionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input type="datetime-local" value={newPredTime} onChange={(e) => setNewPredTime(e.target.value)}
                    style={inpStyle}
                  />
                  {newPredTime && form.kickoffTime && new Date(newPredTime) >= new Date(form.kickoffTime) && (
                    <p className="text-xs mt-1" style={{ color: 'var(--c-orange)' }}>⚠️ After kickoff — won't be counted</p>
                  )}
                </div>
                <button type="button" onClick={addParticipant}
                  disabled={!newName.trim() || !newPrediction || !newPredTime}
                  className="px-4 py-2 bg-fifa-blue text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* List */}
            {participants.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: 'var(--c-t3)' }}>No participants added yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {participants.map((p) => (
                  <div key={p.name} className="rounded-lg px-3 py-2"
                    style={{
                      background: p.lateEntry ? 'var(--c-orange-bg)' : 'var(--c-surface)',
                      border: `1px solid ${p.lateEntry ? 'var(--c-orange-bd)' : 'var(--c-border)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-fifa-blue flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                        {p.name[0].toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--c-t1)' }}>{p.name}</span>
                      {p.lateEntry && <span className="text-xs" style={{ color: 'var(--c-orange)' }}>⚠️ Late</span>}
                      <button type="button" onClick={() => removeParticipant(p.name)}
                        className="text-xl leading-none" style={{ color: 'var(--c-t3)' }}>×</button>
                    </div>
                    <div className="flex gap-2 ml-8">
                      <select value={p.prediction} onChange={(e) => updateParticipant(p.name, 'prediction', e.target.value)}
                        style={{ ...inpStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      >
                        {predictionOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <input type="datetime-local" value={p.predictionTime}
                        onChange={(e) => updateParticipant(p.name, 'predictionTime', e.target.value)}
                        style={{ ...inpStyle, flex: 1, width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          {msg && (
            <div className="px-4 py-2 rounded-lg text-sm" style={
              msg.error
                ? { background: 'var(--c-red-bg)', border: '1px solid var(--c-red-bd)', color: 'var(--c-red)' }
                : { background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }
            }>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={saving || !form.homeTeam || !form.awayTeam || !form.winner}
            className="w-full py-3 bg-fifa-gold font-bold rounded-lg transition-colors disabled:opacity-40"
            style={{ color: '#0F172A' }}
          >
            {saving
              ? 'Saving…'
              : selectedMatchId
              ? `Update Match & Save ${participants.length} Prediction${participants.length !== 1 ? 's' : ''}`
              : `Import New Match & Save ${participants.length} Prediction${participants.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
