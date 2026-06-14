import { useEffect, useState } from 'react';
import { getAllUsers } from '../firebase/services';
import LeaderboardTable from '../components/LeaderboardTable';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers()
      .then((all) => setUsers(all.filter((u) => !u.hideFromLeaderboard)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: '#E8EAFF' }}>
          Leaderboard
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          Ranked by correct picks · accuracy · points
        </p>
      </div>
      <LeaderboardTable users={users} />
    </div>
  );
}
