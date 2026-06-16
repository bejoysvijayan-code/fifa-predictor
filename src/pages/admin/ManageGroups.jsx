import { useEffect, useState } from 'react';
import { getGroups, createGroup, updateGroup, deleteGroup } from '../../firebase/services';

export default function ManageGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setGroups(await getGroups());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    await createGroup(newName.trim());
    setNewName('');
    await load();
    setSaving(false);
  }

  function startEdit(g) {
    setEditingId(g.id);
    setEditName(g.name);
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return;
    setSaving(true);
    await updateGroup(id, { name: editName.trim() });
    setEditingId(null);
    await load();
    setSaving(false);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete group "${name}"? This won't remove users — just the group itself.`)) return;
    await deleteGroup(id);
    await load();
  }

  return (
    <div className="space-y-6">
      {/* Create group */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="flex-1 rounded-xl px-3 py-2 text-[13px]"
          style={{
            background: 'var(--c-input)',
            border: '1px solid var(--c-border)',
            color: 'var(--c-t1)',
          }}
          placeholder="New group name (e.g. Batch 98 JNVN)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: 'var(--c-primary)', color: '#fff', opacity: saving ? 0.6 : 1 }}
        >
          Create
        </button>
      </form>

      {/* Group list */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <p className="text-[13px] text-center py-10" style={{ color: 'var(--c-t3)' }}>
          No groups yet. Create one above.
        </p>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--c-border)' }}
        >
          {groups.map((g, i) => (
            <div
              key={g.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom: i < groups.length - 1 ? '1px solid var(--c-border)' : 'none',
                background: 'var(--c-card)',
              }}
            >
              {editingId === g.id ? (
                <>
                  <input
                    className="flex-1 rounded-lg px-2 py-1 text-[13px]"
                    style={{
                      background: 'var(--c-input)',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-t1)',
                    }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(g.id)}
                    disabled={saving}
                    className="px-3 py-1 rounded-lg text-[12px] font-semibold"
                    style={{ background: 'var(--c-green)', color: '#fff' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 rounded-lg text-[12px]"
                    style={{ background: 'var(--c-border)', color: 'var(--c-t1)' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--c-t1)' }}>
                    {g.name}
                  </span>
                  <button
                    onClick={() => startEdit(g)}
                    className="px-3 py-1 rounded-lg text-[12px]"
                    style={{ background: 'var(--c-input)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(g.id, g.name)}
                    className="px-3 py-1 rounded-lg text-[12px]"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
