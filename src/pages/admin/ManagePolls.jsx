import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { getGroups, getPolls, createPoll, updatePoll, deletePoll, getPollVotes } from '../../firebase/services';

const EMPTY_FORM = { question: '', type: 'prediction', showResults: 'after_vote', deadline: '', allowCustomOptions: false };

const inpStyle = {
  background: 'var(--c-inp)', border: '1px solid var(--c-inp-bd)',
  color: 'var(--c-inp-t)', borderRadius: 8, padding: '8px 12px',
  fontSize: 14, width: '100%', outline: 'none',
};

function ToggleSwitch({ name, checked, onChange, label, hint }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className="relative flex-shrink-0">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
        <div className="w-10 h-5 rounded-full transition-colors"
          style={{ background: checked ? 'var(--c-primary)' : 'var(--c-border)' }}>
          <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform"
            style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium" style={{ color: 'var(--c-t1)' }}>{label}</p>
        {hint && <p className="text-[11px]" style={{ color: 'var(--c-t3)' }}>{hint}</p>}
      </div>
    </label>
  );
}

function OptionsEditor({ opts, onUpdate, onAdd, onRemove }) {
  return (
    <div>
      <label className="text-xs block mb-2" style={{ color: 'var(--c-t2)' }}>Options (min 2, max 8)</label>
      <div className="space-y-2">
        {opts.map((opt, idx) => (
          <div key={idx} className="flex gap-2">
            <input value={opt} onChange={(e) => onUpdate(idx, e.target.value)}
              placeholder={`Option ${idx + 1}`} style={{ ...inpStyle, flex: 1, width: 'auto' }} />
            {opts.length > 2 && (
              <button type="button" onClick={() => onRemove(idx)}
                className="px-3 text-lg rounded-lg flex-shrink-0"
                style={{ background: 'var(--c-red-bg)', color: 'var(--c-red)', border: '1px solid var(--c-red-bd)' }}>×</button>
            )}
          </div>
        ))}
      </div>
      {opts.length < 8 && (
        <button type="button" onClick={onAdd}
          className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
          + Add option
        </button>
      )}
    </div>
  );
}

function toDatetimeLocal(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManagePolls() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [polls, setPolls] = useState([]);
  const [pollVoteCounts, setPollVoteCounts] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [settingResult, setSettingResult] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingPoll, setEditingPoll] = useState(null); // { id, form, options }
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroups().then((g) => {
      setGroups(g);
      if (g.length === 1) setSelectedGroupId(g[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedGroupId) { setPolls([]); return; }
    loadPolls();
  }, [selectedGroupId]);

  async function loadPolls() {
    const data = await getPolls(selectedGroupId);
    setPolls(data);
    const counts = {};
    await Promise.all(data.map(async (p) => {
      const votes = await getPollVotes(p.id);
      counts[p.id] = votes.length;
    }));
    setPollVoteCounts(counts);
  }

  function handleFormChange(e) {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: val }));
  }

  function updateOption(idx, val) {
    setOptions((prev) => prev.map((o, i) => i === idx ? val : o));
  }
  function addOption() { if (options.length < 8) setOptions((prev) => [...prev, '']); }
  function removeOption(idx) { if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleCreate(e) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!form.question.trim() || cleanOptions.length < 2 || !selectedGroupId) {
      flash({ text: 'Fill in the question, at least 2 options, and select a group.', error: true }); return;
    }
    setSaving(true);
    try {
      await createPoll({
        groupId: selectedGroupId,
        question: form.question.trim(),
        options: cleanOptions,
        type: form.type,
        showResults: form.showResults,
        allowCustomOptions: form.allowCustomOptions,
        deadline: form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null,
      });
      flash({ text: '✅ Poll created!' });
      setForm(EMPTY_FORM);
      setOptions(['', '']);
      await loadPolls();
    } catch (err) {
      flash({ text: `Error: ${err.message}`, error: true });
    } finally { setSaving(false); }
  }

  // Edit helpers
  function startEdit(p) {
    setEditingPoll({
      id: p.id,
      form: {
        question: p.question,
        type: p.type,
        showResults: p.showResults,
        allowCustomOptions: p.allowCustomOptions || false,
        deadline: toDatetimeLocal(p.deadline),
      },
      options: [...p.options],
    });
    setSettingResult(null);
  }

  function handleEditFormChange(e) {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setEditingPoll((prev) => ({ ...prev, form: { ...prev.form, [e.target.name]: val } }));
  }
  function updateEditOption(idx, val) {
    setEditingPoll((prev) => ({ ...prev, options: prev.options.map((o, i) => i === idx ? val : o) }));
  }
  function addEditOption() {
    setEditingPoll((prev) => prev.options.length < 8 ? { ...prev, options: [...prev.options, ''] } : prev);
  }
  function removeEditOption(idx) {
    setEditingPoll((prev) => prev.options.length > 2 ? { ...prev, options: prev.options.filter((_, i) => i !== idx) } : prev);
  }

  async function handleSaveEdit() {
    const cleanOptions = editingPoll.options.map((o) => o.trim()).filter(Boolean);
    if (!editingPoll.form.question.trim() || cleanOptions.length < 2) return;
    setSavingEdit(true);
    try {
      await updatePoll(editingPoll.id, {
        question: editingPoll.form.question.trim(),
        options: cleanOptions,
        type: editingPoll.form.type,
        showResults: editingPoll.form.showResults,
        allowCustomOptions: editingPoll.form.allowCustomOptions,
        deadline: editingPoll.form.deadline ? Timestamp.fromDate(new Date(editingPoll.form.deadline)) : null,
      });
      setPolls((prev) => prev.map((p) => p.id === editingPoll.id ? {
        ...p,
        question: editingPoll.form.question.trim(),
        options: cleanOptions,
        type: editingPoll.form.type,
        showResults: editingPoll.form.showResults,
        allowCustomOptions: editingPoll.form.allowCustomOptions,
        deadline: editingPoll.form.deadline ? { toDate: () => new Date(editingPoll.form.deadline) } : null,
      } : p));
      setEditingPoll(null);
    } finally { setSavingEdit(false); }
  }

  async function handleClose(pollId) {
    await updatePoll(pollId, { status: 'closed' });
    setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, status: 'closed' } : p));
  }
  async function handleReopen(pollId) {
    await updatePoll(pollId, { status: 'open', result: null });
    setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, status: 'open', result: null } : p));
  }
  async function handleSetResult(pollId, result) {
    await updatePoll(pollId, { result, status: 'closed' });
    setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, result, status: 'closed' } : p));
    setSettingResult(null);
  }
  async function handleDelete(pollId) {
    await deletePoll(pollId);
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    setConfirmDelete(null);
  }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(null), 5000); }

  if (loading) return <div className="text-center py-8" style={{ color: 'var(--c-t2)' }}>Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Group selector */}
      {groups.length > 1 && (
        <div className="card">
          <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--c-t3)' }}>Group</label>
          <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} style={inpStyle}>
            <option value="">— Select group —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {/* Create form */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--c-t1)' }}>Create Poll</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Question</label>
            <input name="question" value={form.question} onChange={handleFormChange}
              placeholder="e.g. Who will win the Golden Boot?" style={inpStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Type</label>
              <select name="type" value={form.type} onChange={handleFormChange} style={inpStyle}>
                <option value="prediction">🎯 Prediction</option>
                <option value="opinion">📊 Opinion</option>
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Show Results</label>
              <select name="showResults" value={form.showResults} onChange={handleFormChange} style={inpStyle}>
                <option value="after_vote">After voting</option>
                <option value="always">Always (live)</option>
                <option value="after_close">After poll closes</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Deadline (optional)</label>
            <input type="datetime-local" name="deadline" value={form.deadline} onChange={handleFormChange} style={inpStyle} />
          </div>
          <ToggleSwitch name="allowCustomOptions" checked={form.allowCustomOptions} onChange={handleFormChange}
            label="Allow custom answers" hint="Members can type their own answer if not in the list" />
          <OptionsEditor opts={options} onUpdate={updateOption} onAdd={addOption} onRemove={removeOption} />

          {msg && (
            <div className="px-4 py-2 rounded-lg text-sm" style={
              msg.error
                ? { background: 'var(--c-red-bg)', border: '1px solid var(--c-red-bd)', color: 'var(--c-red)' }
                : { background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }
            }>{msg.text}</div>
          )}
          <button type="submit" disabled={saving || !selectedGroupId}
            className="w-full py-2.5 bg-fifa-blue font-semibold rounded-lg disabled:opacity-40 text-white text-sm">
            {saving ? 'Creating…' : 'Create Poll'}
          </button>
        </form>
      </div>

      {/* Polls list */}
      {selectedGroupId && (
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--c-t1)' }}>Polls ({polls.length})</h2>
          {polls.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--c-t2)' }}>No polls yet.</p>
          ) : (
            <div className="space-y-3">
              {polls.map((p) => {
                const isOpen = p.status === 'open';
                const hasResult = p.type === 'prediction' && p.result;
                const isSettingResult = settingResult === p.id;
                const isConfirming = confirmDelete === p.id;
                const isEditing = editingPoll?.id === p.id;
                const voteCount = pollVoteCounts[p.id] ?? '…';

                return (
                  <div key={p.id} className="card space-y-3">
                    {/* Poll header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" style={{ color: 'var(--c-t1)' }}>{p.question}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap" style={{ color: 'var(--c-t3)' }}>
                          <span>{p.type === 'prediction' ? '🎯 Prediction' : '📊 Opinion'}</span>
                          <span>·</span>
                          <span>{voteCount} votes</span>
                          {p.allowCustomOptions && <><span>·</span><span>Custom answers ON</span></>}
                          {hasResult && <><span>·</span><span style={{ color: 'var(--c-green)' }}>✓ {p.result}</span></>}
                        </div>
                        {!isEditing && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.options.map((opt) => (
                              <span key={opt} className="text-[11px] px-2 py-0.5 rounded-full"
                                style={{
                                  background: hasResult && p.result === opt ? 'var(--c-green-bg)' : 'var(--c-surface)',
                                  border: `1px solid ${hasResult && p.result === opt ? 'var(--c-green-bd)' : 'var(--c-border)'}`,
                                  color: hasResult && p.result === opt ? 'var(--c-green)' : 'var(--c-t2)',
                                }}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                        style={
                          hasResult
                            ? { background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }
                            : isOpen
                            ? { background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }
                            : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }
                        }>
                        {hasResult ? 'Result In' : isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>

                    {/* Inline edit form */}
                    {isEditing && (
                      <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-primary-bd)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--c-primary)' }}>Editing</p>
                        <div>
                          <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Question</label>
                          <input name="question" value={editingPoll.form.question} onChange={handleEditFormChange} style={inpStyle} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Type</label>
                            <select name="type" value={editingPoll.form.type} onChange={handleEditFormChange} style={inpStyle}>
                              <option value="prediction">🎯 Prediction</option>
                              <option value="opinion">📊 Opinion</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Show Results</label>
                            <select name="showResults" value={editingPoll.form.showResults} onChange={handleEditFormChange} style={inpStyle}>
                              <option value="after_vote">After voting</option>
                              <option value="always">Always (live)</option>
                              <option value="after_close">After poll closes</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs block mb-1" style={{ color: 'var(--c-t2)' }}>Deadline</label>
                          <input type="datetime-local" name="deadline" value={editingPoll.form.deadline} onChange={handleEditFormChange} style={inpStyle} />
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <div className="relative flex-shrink-0">
                            <input type="checkbox" name="allowCustomOptions" checked={editingPoll.form.allowCustomOptions} onChange={handleEditFormChange} className="sr-only" />
                            <div className="w-10 h-5 rounded-full transition-colors"
                              style={{ background: editingPoll.form.allowCustomOptions ? 'var(--c-primary)' : 'var(--c-border)' }}>
                              <div className="w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform"
                                style={{ transform: editingPoll.form.allowCustomOptions ? 'translateX(22px)' : 'translateX(2px)' }} />
                            </div>
                          </div>
                          <span className="text-[13px] font-medium" style={{ color: 'var(--c-t1)' }}>Allow custom answers</span>
                        </label>
                        <OptionsEditor opts={editingPoll.options} onUpdate={updateEditOption} onAdd={addEditOption} onRemove={removeEditOption} />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} disabled={savingEdit}
                            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 text-white"
                            style={{ background: 'var(--c-primary)' }}>
                            {savingEdit ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button onClick={() => setEditingPoll(null)}
                            className="px-4 py-2 rounded-lg text-sm"
                            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Set result panel */}
                    {isSettingResult && !isEditing && (
                      <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                        <p className="text-xs font-semibold" style={{ color: 'var(--c-t2)' }}>Select the correct answer:</p>
                        <div className="flex flex-wrap gap-2">
                          {p.options.map((opt) => (
                            <button key={opt} onClick={() => handleSetResult(p.id, opt)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium"
                              style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }}>
                              ✓ {opt}
                            </button>
                          ))}
                          <button onClick={() => setSettingResult(null)}
                            className="px-3 py-1.5 rounded-lg text-sm"
                            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => startEdit(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
                          ✏️ Edit
                        </button>
                        {isOpen ? (
                          <button onClick={() => handleClose(p.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
                            Close Poll
                          </button>
                        ) : (
                          <button onClick={() => handleReopen(p.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
                            Reopen
                          </button>
                        )}
                        {p.type === 'prediction' && !hasResult && (
                          <button onClick={() => setSettingResult(isSettingResult ? null : p.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }}>
                            Set Result
                          </button>
                        )}
                        <div className="ml-auto">
                          {isConfirming ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDelete(p.id)}
                                className="px-2 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg">Delete</button>
                              <button onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1.5 text-xs rounded-lg"
                                style={{ background: 'var(--c-surface)', color: 'var(--c-t2)' }}>Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(p.id)}
                              className="px-2 py-1.5 text-xs rounded-lg"
                              style={{ border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-red-bd)'; e.currentTarget.style.color = 'var(--c-red)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-t3)'; }}>
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
