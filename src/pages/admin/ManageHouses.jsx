import { useEffect, useState } from 'react';
import { getAllUsers, getHouses, createHouse, updateHouse, deleteHouse, assignUserToHouse } from '../../firebase/services';

const COLORS = [
  { label: 'Red',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)' },
  { label: 'Yellow', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
  { label: 'Blue',   color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)' },
  { label: 'Green',  color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
  { label: 'Purple', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)' },
  { label: 'Orange', color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
];

function colorMeta(colorHex) {
  return COLORS.find((c) => c.color === colorHex) || COLORS[0];
}

export default function ManageHouses() {
  const [houses, setHouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0].color);
  const [newEmoji, setNewEmoji] = useState('🏠');

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  async function load() {
    const [hs, us] = await Promise.all([getHouses(), getAllUsers()]);
    setHouses(hs);
    setUsers(us);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function flash(text, error = false) {
    setMsg({ text, error });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createHouse({ name: newName.trim(), color: newColor, emoji: newEmoji });
      setNewName(''); setNewColor(COLORS[0].color); setNewEmoji('🏠');
      await load();
      flash('House created.');
    } catch (e) { flash(e.message, true); }
    setSaving(false);
  }

  async function handleUpdate(houseId) {
    setSaving(true);
    try {
      await updateHouse(houseId, { name: editName.trim(), color: editColor, emoji: editEmoji });
      setEditingId(null);
      await load();
      flash('House updated.');
    } catch (e) { flash(e.message, true); }
    setSaving(false);
  }

  async function handleDelete(houseId) {
    if (!confirm('Delete this house? Members will become unassigned.')) return;
    setSaving(true);
    try {
      await deleteHouse(houseId);
      await load();
      flash('House deleted.');
    } catch (e) { flash(e.message, true); }
    setSaving(false);
  }

  async function handleAssign(userId, houseId) {
    try {
      await assignUserToHouse(userId, houseId || null);
      setUsers((prev) => prev.map((u) => (u.uid || u.id) === userId ? { ...u, houseId: houseId || null } : u));
    } catch (e) { flash(e.message, true); }
  }

  const houseMap = Object.fromEntries(houses.map((h) => [h.id, h]));

  const inp = {
    background: 'var(--c-input)', border: '1px solid var(--c-border)',
    color: 'var(--c-t1)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none',
  };

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;

  return (
    <div className="space-y-6">

      {/* ── Create house ── */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
        <h3 className="text-[14px] font-bold" style={{ color: 'var(--c-t1)' }}>Create House</h3>
        <div className="flex gap-2 flex-wrap">
          <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
            style={{ ...inp, width: 56, textAlign: 'center', fontSize: 20 }} placeholder="🏠" />
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="House name (e.g. Red House)"
            style={{ ...inp, flex: 1, minWidth: 140 }} />
          <div className="flex gap-1.5 items-center">
            {COLORS.map((c) => (
              <button key={c.color} onClick={() => setNewColor(c.color)}
                className="w-6 h-6 rounded-full transition-transform"
                style={{
                  background: c.color,
                  transform: newColor === c.color ? 'scale(1.3)' : 'scale(1)',
                  outline: newColor === c.color ? `2px solid ${c.color}` : 'none',
                  outlineOffset: 2,
                }} />
            ))}
          </div>
          <button onClick={handleCreate} disabled={saving || !newName.trim()}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold disabled:opacity-40"
            style={{ background: newColor, color: '#fff' }}>
            + Add
          </button>
        </div>
      </div>

      {/* ── House list ── */}
      {houses.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="px-4 py-3 text-[13px] font-bold" style={{ color: 'var(--c-t1)', borderBottom: '1px solid var(--c-border)' }}>
            Houses ({houses.length})
          </div>
          {houses.map((h, i) => {
            const cm = colorMeta(h.color);
            const memberCount = users.filter((u) => u.houseId === h.id).length;
            const isEditing = editingId === h.id;
            return (
              <div key={h.id} className="px-4 py-3 flex items-center gap-3"
                style={{ borderTop: i > 0 ? '1px solid var(--c-border)' : 'none' }}>
                {isEditing ? (
                  <>
                    <input value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)}
                      style={{ ...inp, width: 48, textAlign: 'center', fontSize: 18 }} />
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      style={{ ...inp, flex: 1 }} />
                    <div className="flex gap-1 items-center">
                      {COLORS.map((c) => (
                        <button key={c.color} onClick={() => setEditColor(c.color)}
                          className="w-5 h-5 rounded-full"
                          style={{
                            background: c.color,
                            transform: editColor === c.color ? 'scale(1.3)' : 'scale(1)',
                            outline: editColor === c.color ? `2px solid ${c.color}` : 'none',
                            outlineOffset: 2,
                          }} />
                      ))}
                    </div>
                    <button onClick={() => handleUpdate(h.id)} disabled={saving}
                      className="px-3 py-1 rounded-lg text-[12px] font-semibold"
                      style={{ background: 'var(--c-green-bg)', color: 'var(--c-green)', border: '1px solid var(--c-green-bd)' }}>
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-1 rounded-lg text-[12px]"
                      style={{ background: 'var(--c-surface)', color: 'var(--c-t3)', border: '1px solid var(--c-border)' }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xl w-7 text-center flex-shrink-0">{h.emoji || '🏠'}</span>
                    <div className="flex-1">
                      <span className="text-[13px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}` }}>
                        {h.name}
                      </span>
                      <span className="text-[11px] ml-2" style={{ color: 'var(--c-t3)' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <button onClick={() => { setEditingId(h.id); setEditName(h.name); setEditColor(h.color); setEditEmoji(h.emoji || '🏠'); }}
                      className="px-3 py-1 rounded-lg text-[12px]"
                      style={{ background: 'var(--c-input)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(h.id)}
                      className="px-3 py-1 rounded-lg text-[12px]"
                      style={{ background: 'var(--c-red-bg)', color: 'var(--c-red)', border: '1px solid var(--c-red-bd)' }}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Member assignment ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--c-border)' }}>
          <span className="text-[13px] font-bold" style={{ color: 'var(--c-t1)' }}>
            Assign Members to Houses
          </span>
          <span className="text-[11px]" style={{ color: 'var(--c-t3)' }}>
            {users.filter((u) => u.houseId).length}/{users.length} assigned
          </span>
        </div>
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {users.map((u, i) => {
            const uid = u.uid || u.id;
            const house = houseMap[u.houseId];
            const cm = house ? colorMeta(house.color) : null;
            return (
              <div key={uid} className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid var(--c-border)' : 'none' }}>
                {u.photoURL ? (
                  <img src={u.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--c-primary)', color: '#fff' }}>
                    {u.displayName?.[0] || '?'}
                  </div>
                )}
                <span className="flex-1 text-[13px] truncate" style={{ color: 'var(--c-t1)' }}>
                  {u.displayName || u.email}
                </span>
                {house && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}` }}>
                    {house.emoji} {house.name}
                  </span>
                )}
                <select value={u.houseId || ''} onChange={(e) => handleAssign(uid, e.target.value)}
                  style={{ ...inp, padding: '4px 8px', fontSize: 12, width: 'auto' }}>
                  <option value="">— No house —</option>
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {msg && (
        <div className="px-4 py-2 rounded-xl text-[13px]"
          style={msg.error
            ? { background: 'var(--c-red-bg)', color: 'var(--c-red)', border: '1px solid var(--c-red-bd)' }
            : { background: 'var(--c-green-bg)', color: 'var(--c-green)', border: '1px solid var(--c-green-bd)' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
