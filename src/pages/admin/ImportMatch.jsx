import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  getMatches,
  getGroups,
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
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
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
    getGroups().then(setGroups);
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

  function removeParticipant(idx) {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateParticipant(idx, field, value) {
    setParticipants((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const updated = { ...p, [field]: value };
        if (field === 'predictionTime') {
          const kickoff = form.kickoffTime ? new Date(form.kickoffTime) : null;
          updated.lateEntry = !!(kickoff && value && new Date(value) >= kickoff);
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
      const groupId = selectedGroupId === '__all__'
        ? groups.map((g) => g.id)
        : (selectedGroupId || null);
      if (selectedMatchId) {
        await addPredictionsToExistingMatch(selectedMatchId, kickoffTs, form.winner, participantPayload, groupId);
      } else {
        await importHistoricalMatch({
          matchNumber: form.matchNumber ? Number(form.matchNumber) : null,
          homeTeam: form.homeTeam.trim(),
          awayTeam: form.awayTeam.trim(),
          kickoffTime: kickoffTs,
          winner: form.winner,
          participants: participantPayload,
          groupId,
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

  function parseDateTime(raw) {
    if (!raw) return '';
    // Normalize WhatsApp "at" separator: "16/6/2026 at 6:50 pm" → "16/6/2026 6:50 pm"
    const normalized = raw.replace(/\s+at\s+/i, ' ');
    // Handle DD/MM/YYYY HH:MM [AM/PM] and DD-MM-YYYY HH:MM [AM/PM]
    const dmyMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[\s,T](\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (dmyMatch) {
      const [, d, m, y, rawH, min, ampm] = dmyMatch;
      let h = parseInt(rawH, 10);
      if (ampm) {
        const upper = ampm.toUpperCase();
        if (upper === 'AM' && h === 12) h = 0;
        if (upper === 'PM' && h !== 12) h += 12;
      }
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${String(h).padStart(2,'0')}:${min}`;
    }
    // Try native parse for ISO / standard formats (handles AM/PM natively)
    const parsed = new Date(normalized);
    if (!isNaN(parsed)) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${parsed.getFullYear()}-${pad(parsed.getMonth()+1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
    }
    return '';
  }

  function handleCSVImport(text) {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    // Skip header row if it looks like one
    const start = /^name[,\t]/i.test(lines[0]) ? 1 : 0;
    const rows = lines.slice(start);

    let added = 0, skipped = 0, invalid = 0;
    const newList = [...participants];

    rows.forEach((line) => {
      const cols = line.split(/[,\t]/).map((s) => s.trim().replace(/^"|"$/g, ''));
      const [rawName, rawPred, rawTime] = cols;
      if (!rawName) return;

      if (newList.find((p) => p.name.toLowerCase() === rawName.toLowerCase())) {
        skipped++; return;
      }
      if (predictionOptions.length && !predictionOptions.includes(rawPred)) {
        invalid++; return;
      }
      const predictionTime = parseDateTime(rawTime);
      const kickoff = form.kickoffTime ? new Date(form.kickoffTime) : null;
      const lateEntry = !!(kickoff && predictionTime && new Date(predictionTime) >= kickoff);
      newList.push({ name: rawName, prediction: rawPred, predictionTime, lateEntry });
      added++;
    });

    setParticipants(newList);
    const parts = [];
    if (added)   parts.push(`${added} added`);
    if (skipped) parts.push(`${skipped} duplicate${skipped > 1 ? 's' : ''} skipped`);
    if (invalid) parts.push(`${invalid} invalid prediction${invalid > 1 ? 's' : ''} skipped`);
    flash({ text: `CSV: ${parts.join(', ')}.`, error: invalid > 0 && added === 0 });
  }

  function onCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleCSVImport(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  }

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

          {/* Group assignment */}
          {groups.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide block mb-1" style={{ color: 'var(--c-t3)' }}>
                Assign to group <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-[13px]"
                style={{
                  background: !selectedGroupId ? 'var(--c-orange-bg)' : 'var(--c-input)',
                  border: `1px solid ${!selectedGroupId ? 'var(--c-orange-bd)' : 'var(--c-border)'}`,
                  color: !selectedGroupId ? 'var(--c-orange)' : 'var(--c-t1)',
                }}
              >
                <option value="">— Select a group —</option>
                <option value="__all__">🌐 All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {!selectedGroupId && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--c-orange)' }}>
                  ⚠️ No group selected — match won't be visible to any group members.
                </p>
              )}
              {selectedGroupId === '__all__' && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--c-green)' }}>
                  ✓ Match and predictions will be added to all {groups.length} groups.
                </p>
              )}
            </div>
          )}

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

            {/* CSV import */}
            <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--c-surface)', border: '1px dashed var(--c-border-s)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--c-t2)' }}>
                📄 Import from CSV
              </p>
              <p className="text-[11px] mb-2" style={{ color: 'var(--c-t3)' }}>
                CSV format: <code style={{ background: 'var(--c-border)', padding: '1px 4px', borderRadius: 3 }}>name,prediction,time</code> — time is optional. Accepts 24-hour (<code style={{ background: 'var(--c-border)', padding: '1px 4px', borderRadius: 3 }}>13/06/2026 14:30</code>) or 12-hour (<code style={{ background: 'var(--c-border)', padding: '1px 4px', borderRadius: 3 }}>13/06/2026 2:30 PM</code>).
              </p>
              <div className="flex gap-2 mb-2">
                <label
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}
                >
                  ⬆ Upload .csv file
                  <input type="file" accept=".csv,.txt" onChange={onCSVFile} className="hidden" />
                </label>
              </div>
              <textarea
                rows={4}
                placeholder={'name,prediction,time\nRajesh,Brazil,13/06/2026 10:30\nSuresh,Argentina,13/06/2026 11:45\nPriya,Draw,13/06/2026 09:15\nRavi,Brazil'}
                onPaste={(e) => { e.preventDefault(); handleCSVImport(e.clipboardData.getData('text')); }}
                style={{ ...inpStyle, fontSize: 12, resize: 'vertical', fontFamily: 'monospace' }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--c-t3)' }}>
                Paste CSV text above — it imports automatically on paste.
              </p>
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
                {participants.map((p, idx) => (
                  <div key={idx} className="rounded-lg px-3 py-2"
                    style={{
                      background: p.lateEntry ? 'var(--c-orange-bg)' : 'var(--c-surface)',
                      border: `1px solid ${p.lateEntry ? 'var(--c-orange-bd)' : 'var(--c-border)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-fifa-blue flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                        {p.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <input
                        value={p.name}
                        onChange={(e) => updateParticipant(idx, 'name', e.target.value)}
                        style={{ ...inpStyle, flex: 1, padding: '3px 8px', fontSize: 13, fontWeight: 500 }}
                      />
                      {p.lateEntry && <span className="text-xs flex-shrink-0" style={{ color: 'var(--c-orange)' }}>⚠️ Late</span>}
                      <button type="button" onClick={() => removeParticipant(idx)}
                        className="text-xl leading-none flex-shrink-0" style={{ color: 'var(--c-t3)' }}>×</button>
                    </div>
                    <div className="flex gap-2 ml-8">
                      <select value={p.prediction} onChange={(e) => updateParticipant(idx, 'prediction', e.target.value)}
                        style={{ ...inpStyle, width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      >
                        {predictionOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <input type="datetime-local" value={p.predictionTime}
                        onChange={(e) => updateParticipant(idx, 'predictionTime', e.target.value)}
                        style={{ ...inpStyle, flex: 1, width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group reminder before submit */}
          {!selectedGroupId && participants.length > 0 && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--c-orange-bg)', border: '1px solid var(--c-orange-bd)', color: 'var(--c-orange)' }}>
              ⚠️ Reminder: no group selected. This match will be hidden from all group members. Select a group above or choose "All Groups" before importing.
            </div>
          )}

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
