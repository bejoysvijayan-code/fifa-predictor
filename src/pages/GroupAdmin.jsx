import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getGroups, getGroupMembers, getAllUsers,
  assignUserToGroup, removeUserFromGroup,
} from '../firebase/services';

export default function GroupAdmin() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  async function load() {
    const [groups, groupMembers, users] = await Promise.all([
      getGroups(),
      getGroupMembers(groupId),
      getAllUsers(),
    ]);
    const g = groups.find((x) => x.id === groupId);
    if (!g) { navigate('/'); return; }

    // Only allow app admins or group admins
    const isGroupAdmin = (g.adminIds || []).includes(user.uid);
    if (!user.isAdmin && !isGroupAdmin) { setUnauthorized(true); setLoading(false); return; }

    setGroup(g);
    setMembers(groupMembers);
    setAllUsers(users);
    setLoading(false);
  }

  useEffect(() => { load(); }, [groupId]);

  async function handleRemove(uid) {
    setUpdating(uid);
    await removeUserFromGroup(uid, groupId);
    setMembers((prev) => prev.filter((u) => (u.uid || u.id) !== uid));
    setUpdating(null);
  }

  async function handleAdd(u) {
    const uid = u.uid || u.id;
    setUpdating(uid);
    await assignUserToGroup(uid, groupId);
    setMembers((prev) => [...prev, u]);
    setSearch('');
    setUpdating(null);
  }

  const memberIds = new Set(members.map((u) => u.uid || u.id));

  const searchResults = search.trim().length > 1
    ? allUsers.filter((u) => {
        const uid = u.uid || u.id;
        return !memberIds.has(uid) &&
          u.displayName?.toLowerCase().includes(search.toLowerCase());
      }).slice(0, 6)
    : [];

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="spinner" /></div>;
  }

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-4xl">🚫</span>
        <p className="text-[14px]" style={{ color: 'var(--c-t2)' }}>You don't have permission to manage this group.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-7 space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} className="text-[12px] mb-3 flex items-center gap-1"
          style={{ color: 'var(--c-t3)' }}>
          ← Back
        </button>
        <h1 className="text-[22px] font-bold" style={{ color: 'var(--c-t1)' }}>
          {group.name}
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add member */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
        <div className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>Add Member</div>
        <input
          className="w-full rounded-xl px-3 py-2.5 text-[13px]"
          style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-t1)', outline: 'none' }}
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            {searchResults.map((u, i) => {
              const uid = u.uid || u.id;
              const isUpdating = updating === uid;
              return (
                <div key={uid} className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    borderBottom: i < searchResults.length - 1 ? '1px solid var(--c-border)' : 'none',
                    background: 'var(--c-surface)',
                  }}>
                  {u.photoURL
                    ? <img src={u.photoURL} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                    : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--c-primary)', color: '#fff' }}>{u.displayName?.[0]}</div>
                  }
                  <span className="flex-1 text-[13px]" style={{ color: 'var(--c-t1)' }}>{u.displayName}</span>
                  <button onClick={() => handleAdd(u)} disabled={isUpdating}
                    className="px-3 py-1 rounded-lg text-[12px] font-semibold disabled:opacity-50"
                    style={{ background: 'var(--c-primary)', color: '#fff' }}>
                    {isUpdating ? '…' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current members */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--c-border)' }}>
        <div className="px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--c-t1)', background: 'var(--c-surface)' }}>
          Current Members
        </div>
        {members.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--c-t3)' }}>No members yet.</div>
        ) : (
          members.map((u, i) => {
            const uid = u.uid || u.id;
            const isUpdating = updating === uid;
            const isGroupAdm = (group.adminIds || []).includes(uid);
            return (
              <div key={uid} className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderTop: '1px solid var(--c-border)',
                  background: 'var(--c-card)',
                }}>
                {u.photoURL
                  ? <img src={u.photoURL} className="w-8 h-8 rounded-full flex-shrink-0" alt="" />
                  : <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: 'var(--c-primary)', color: '#fff' }}>{u.displayName?.[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--c-t1)' }}>{u.displayName}</div>
                  {isGroupAdm && <div className="text-[10px]" style={{ color: 'var(--c-gold)' }}>Group Admin</div>}
                </div>
                <button onClick={() => handleRemove(uid)} disabled={isUpdating}
                  className="px-2.5 py-1 rounded-lg text-[12px] disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {isUpdating ? '…' : 'Remove'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
