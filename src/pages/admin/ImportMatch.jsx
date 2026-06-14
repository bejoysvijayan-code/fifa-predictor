import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  getMatches,
  importHistoricalMatch,
  addPredictionsToExistingMatch,
  recalculateLeaderboard,
} from '../../firebase/services';
import { getFlag, formatKickoff } from '../../utils/scoring';

const EMPTY_FORM = {
  matchNumber: '',
  homeTeam: '',
  awayTeam: '',
  kickoffTime: '',
  winner: '',
};

function toDatetimeLocal(firestoreTs) {
  if (!firestoreTs) return '';
  const d = firestoreTs.toDate ? firestoreTs.toDate() : new Date(firestoreTs);
  // datetime-local requires "YYYY-MM-DDTHH:MM"
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ImportMatch() {
  const [existingMatches, setExistingMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [locked, setLocked] = useState(false); // true when an existing match is selected

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

  // When admin selects an existing match, auto-fill form fields
  function handleMatchSelect(e) {
    const id = e.target.value;
    setSelectedMatchId(id);
    setParticipants([]);

    if (!id) {
      setForm(EMPTY_FORM);
      setLocked(false);
      return;
    }

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
      flash({ text: `${name} already added.`, error: true });
      return;
    }
    const kickoff = form.kickoffTime ? new Date(form.kickoffTime) : null;
    const predTime = new Date(newPredTime);
    const lateEntry = kickoff && predTime >= kickoff;

    setParticipants((prev) => [...prev, { name, prediction: newPrediction, predictionTime: newPredTime, lateEntry }]);
    setNewName('');
    setNewPrediction('');
    setNewPredTime('');
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
      flash({ text: 'Please fill in all match fields including the result.', error: true });
      return;
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
        // Update existing match + add predictions
        await addPredictionsToExistingMatch(
          selectedMatchId,
          kickoffTs,
          form.winner,
          participantPayload
        );
      } else {
        // Create brand new match with predictions
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
      flash({
        text: `✅ ${selectedMatchId ? 'Updated' : 'Imported'}! ${counted} prediction${counted !== 1 ? 's' : ''} saved${late > 0 ? `, ${late} skipped (after kickoff)` : ''}.`,
      });

      // Reset
      setSelectedMatchId('');
      setForm(EMPTY_FORM);
      setLocked(false);
      setParticipants([]);

      // Refresh match list
      getMatches().then(setExistingMatches);
    } catch (err) {
      flash({ text: `Error: ${err.message}`, error: true });
    } finally {
      setSaving(false);
    }
  }

  function flash(m) {
    setMsg(m);
    setTimeout(() => setMsg(null), 6000);
  }

  const predictionOptions = form.homeTeam && form.awayTeam
    ? [form.homeTeam.trim(), 'Draw', form.awayTeam.trim()]
    : [];

  const lateCount = participants.filter((p) => p.lateEntry).length;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-1">Import Match Predictions</h2>
        <p className="text-xs text-gray-500 mb-4">
          Select an existing match or enter a new one. Predictions after kickoff are saved but not scored.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Select existing match ─────────────────────── */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <label className="text-xs font-semibold text-fifa-gold uppercase tracking-wide block mb-2">
              Load from Existing Match
            </label>
            <select
              value={selectedMatchId}
              onChange={handleMatchSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">— Enter match details manually —</option>
              {existingMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.matchNumber ? `#${m.matchNumber} · ` : ''}{m.homeTeam} vs {m.awayTeam}
                  {m.result?.winner ? ` ✓ ${m.result.winner}` : ''}
                </option>
              ))}
            </select>
            {selectedMatchId && (
              <p className="text-xs text-green-400 mt-1.5">
                ✓ Match loaded — team names and kickoff time are auto-filled and locked.
              </p>
            )}
          </div>

          {/* ── Match details ─────────────────────────────── */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Match Number</label>
            <input
              type="number"
              name="matchNumber"
              value={form.matchNumber}
              onChange={handleFormChange}
              disabled={locked}
              placeholder="e.g. 1"
              min="1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Home Team</label>
              <input
                name="homeTeam"
                value={form.homeTeam}
                onChange={handleFormChange}
                disabled={locked}
                placeholder="e.g. Brazil"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Away Team</label>
              <input
                name="awayTeam"
                value={form.awayTeam}
                onChange={handleFormChange}
                disabled={locked}
                placeholder="e.g. Argentina"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Kickoff Date & Time</label>
            <input
              type="datetime-local"
              name="kickoffTime"
              value={form.kickoffTime}
              onChange={handleFormChange}
              disabled={locked}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* ── Result ───────────────────────────────────── */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Result (Winner)</label>
            {predictionOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {predictionOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, winner: opt }))}
                    className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      form.winner === opt
                        ? 'bg-green-700 border-green-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-green-600'
                    }`}
                  >
                    {opt === 'Draw' ? '🤝 Draw' : `${getFlag(opt)} ${opt}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">Enter both team names first</p>
            )}
          </div>

          {/* ── Participants ──────────────────────────────── */}
          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                Participant Predictions ({participants.length})
              </label>
              {lateCount > 0 && (
                <span className="text-xs text-orange-400 font-medium">
                  ⚠️ {lateCount} after kickoff
                </span>
              )}
            </div>

            {/* Add row */}
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                  placeholder="Participant name"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <select
                  value={newPrediction}
                  onChange={(e) => setNewPrediction(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
                >
                  <option value="">Pick</option>
                  {predictionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="datetime-local"
                    value={newPredTime}
                    onChange={(e) => setNewPredTime(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Prediction time"
                  />
                  {newPredTime && form.kickoffTime && new Date(newPredTime) >= new Date(form.kickoffTime) && (
                    <p className="text-xs text-orange-400 mt-1">⚠️ After kickoff — won't be counted</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addParticipant}
                  disabled={!newName.trim() || !newPrediction || !newPredTime}
                  className="px-4 py-2 bg-fifa-blue hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            {/* List */}
            {participants.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">No participants added yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {participants.map((p) => (
                  <div
                    key={p.name}
                    className={`rounded-lg px-3 py-2 border ${
                      p.lateEntry ? 'bg-orange-950/30 border-orange-800' : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-full bg-fifa-blue flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {p.name[0].toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm text-white font-medium truncate">{p.name}</span>
                      {p.lateEntry && <span className="text-xs text-orange-400">⚠️ Late</span>}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p.name)}
                        className="text-gray-600 hover:text-red-400 text-xl leading-none"
                      >×</button>
                    </div>
                    <div className="flex gap-2 ml-8">
                      <select
                        value={p.prediction}
                        onChange={(e) => updateParticipant(p.name, 'prediction', e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {predictionOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        value={p.predictionTime}
                        onChange={(e) => updateParticipant(p.name, 'predictionTime', e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          {msg && (
            <div className={`px-4 py-2 rounded-lg text-sm ${
              msg.error
                ? 'bg-red-900/30 border border-red-700 text-red-400'
                : 'bg-green-900/30 border border-green-700 text-green-400'
            }`}>
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.homeTeam || !form.awayTeam || !form.winner}
            className="w-full py-3 bg-fifa-gold hover:bg-yellow-500 text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-40"
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
