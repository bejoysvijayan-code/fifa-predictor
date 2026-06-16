import { useEffect, useState } from 'react';
import { getAllUsers, getGroups } from '../firebase/services';
import LeaderboardTable from '../components/LeaderboardTable';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllUsers().then((all) => all.filter((u) => !u.hideFromLeaderboard)),
      getGroups(),
    ]).then(([visibleUsers, allGroups]) => {
      setUsers(visibleUsers);
      setGroups(allGroups);
      setLoading(false);
    });
  }, []);

  const filteredUsers =
    activeGroup === 'all'
      ? users
      : users.filter((u) => (u.groupIds || []).includes(activeGroup));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
          Leaderboard
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--c-t2)' }}>
          Ranked by correct picks · accuracy · points
        </p>
      </div>

      {/* Group tabs */}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveGroup('all')}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
            style={
              activeGroup === 'all'
                ? { background: 'var(--c-primary)', color: '#fff' }
                : { background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }
            }
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
              style={
                activeGroup === g.id
                  ? { background: 'var(--c-primary)', color: '#fff' }
                  : { background: 'var(--c-surface)', color: 'var(--c-t2)', border: '1px solid var(--c-border)' }
              }
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <LeaderboardTable users={filteredUsers} />
    </div>
  );
}
