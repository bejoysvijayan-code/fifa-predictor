import { useEffect, useState } from 'react';
import {
  getGroups, createGroup, updateGroup, deleteGroup,
  getGroupMembers, setGroupAdmin,
} from '../../firebase/services';

export default function ManageGroups() {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState({});       // groupId → users[]
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [adminUpdating, setAdminUpdating] = useState(null);

  async function load() {
    setLoading(true);
    setGroups(await getGroups());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function expandGroup(g) {
    if (expandedId === g.id) { setExpandedId(null); return; }
    setExpandedId(g.id);
    if (!members[g.id]) {
      const m = await getGroupMembers(g.id);
      setMembers((prev) => ({ ...prev, [g.id]: m }));
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    await createGroup(newName.trim());
    setNewName('');
    await load();
    setSaving(false);
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
    setExpandedId(null);
    await load();
  }

  async function toggleAdmin(groupId, userId, currentlyAdmin) {
    setAdminUpdating(userId);
    await setGroupAdmin(groupId, userId, !currentlyAdmin);
    // Update local group adminIds
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const adminIds = g.adminIds || [];
      return {
        ...g,
        adminIds: currentlyAdmin
          ? adminIds.filter((id) => id !== userId)
          : [...adminIds, userId],
      };
    }));
    setAdminUpdating(null);
  }

  return (
    <div className="space-y-6">
      {/* Create group */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="flex-1 rounded-xl px-3 py-2 text-[13px]"
          style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}
          placeholder="New group name (e.g. Batch 98 JNVN)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" disabled={saving || !newName.trim()}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: 'var(--c-primary)', color: '#fff', opacity: saving ? 0.6 : 1 }}>
          Create
        </button>
      </form>

      {/* Group list */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <p className="text-[13px] text-center py-10" style={{ color: 'var(--c-t3)' }}>No groups yet.</p>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const isExpanded = expandedId === g.id;
            const groupMembers = members[g.id] || [];
            const adminIds = g.adminIds || [];

            return (
              <div key={g.id} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--c-border)', background: 'var(--c-card)' }}>

                {/* Group header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {editingId === g.id ? (
                    <>
                      <input autoFocus
                        className="flex-1 rounded-lg px-2 py-1 text-[13px]"
                        style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <button onClick={() => handleUpdate(g.id)} disabled={saving}
                        className="px-3 py-1 rounded-lg text-[12px] font-semibold"
                        style={{ background: 'var(--c-green)', color: '#fff' }}>Save</button>
                      <button onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded-lg text-[12px]"
                        style={{ background: 'var(--c-border)', color: 'var(--c-t1)' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => expandGroup(g)} className="flex-1 flex items-center gap-2 text-left">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--c-t1)' }}>{g.name}</span>
                        {adminIds.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--c-gold-bg)', color: 'var(--c-gold)', border: '1px solid var(--c-gold-bd)' }}>
                            {adminIds.length} admin{adminIds.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className={`ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          style={{ color: 'var(--c-t3)' }}>▾</span>
                      </button>
                      <button onClick={() => { setEditingId(g.id); setEditName(g.name); }}
                        className="px-3 py-1 rounded-lg text-[12px]"
                        style={{ background: 'var(--c-input)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }}>
                        Rename
                      </button>
                      <button onClick={() => handleDelete(g.id, g.name)}
                        className="px-3 py-1 rounded-lg text-[12px]"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {/* Expanded: members + admin toggles */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1" style={{ borderTop: '1px solid var(--c-border)' }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide mb-2 mt-3"
                      style={{ color: 'var(--c-t3)' }}>
                      Members & Group Admins
                    </div>
                    {groupMembers.length === 0 ? (
                      <p className="text-[12px]" style={{ color: 'var(--c-t3)' }}>No members yet. Assign users from the Users tab.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {groupMembers.map((u) => {
                          const uid = u.uid || u.id;
                          const isAdmin = adminIds.includes(uid);
                          const isUpdating = adminUpdating === uid;
                          return (
                            <div key={uid} className="flex items-center gap-3 rounded-xl px-3 py-2"
                              style={{ background: 'var(--c-surface)' }}>
                              {u.photoURL
                                ? <img src={u.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: 'var(--c-primary)', color: '#fff' }}>{u.displayName?.[0]}</div>
                              }
                              <span className="flex-1 text-[13px]" style={{ color: 'var(--c-t1)' }}>{u.displayName}</span>
                              {isAdmin && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--c-gold-bg)', color: 'var(--c-gold)' }}>admin</span>
                              )}
                              <button
                                disabled={isUpdating}
                                onClick={() => toggleAdmin(g.id, uid, isAdmin)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium disabled:opacity-50"
                                style={isAdmin
                                  ? { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
                                  : { background: 'var(--c-gold-bg)', color: 'var(--c-gold)', border: '1px solid var(--c-gold-bd)' }
                                }>
                                {isUpdating ? '…' : isAdmin ? 'Remove Admin' : 'Make Admin'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
