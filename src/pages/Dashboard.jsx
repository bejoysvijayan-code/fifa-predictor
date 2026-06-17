import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getMatches, getUserPredictions, getUser, getAllUsers, getPolls, getUserPollVote, castVote, getRecentActivity } from '../firebase/services';
import { sortLeaderboard as sort } from '../utils/scoring';
import UserStatsCard from '../components/UserStatsCard';
import MatchCard from '../components/MatchCard';

export default function Dashboard() {
  const { user } = useAuth();
  const { activeGroupId, myGroups } = useGroup();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [rank, setRank] = useState(null);
  const [openPolls, setOpenPolls] = useState([]);
  const [pollVotes, setPollVotes] = useState({}); // pollId -> userVote
  const [votingPoll, setVotingPoll] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [allMatches, userPreds, stats, allUsers] = await Promise.all([
      getMatches(),
      getUserPredictions(user.uid),
      getUser(user.uid),
      getAllUsers(),
    ]);
    setMatches(allMatches);
    setPredictions(userPreds);
    setUserStats(stats);

    const poolUsers = activeGroupId
      ? allUsers.filter((u) => !u.hideFromLeaderboard && (u.groupIds || []).includes(activeGroupId))
      : allUsers.filter((u) => !u.hideFromLeaderboard);
    const sorted = sort(poolUsers);
    const idx = sorted.findIndex((u) => (u.uid || u.id) === user.uid);
    setRank(idx >= 0 ? idx + 1 : null);

    // Load open polls for active group
    if (activeGroupId) {
      const polls = await getPolls(activeGroupId);
      const open = polls.filter((p) => p.status === 'open').slice(0, 2);
      setOpenPolls(open);
      const votes = {};
      await Promise.all(open.map(async (p) => {
        const v = await getUserPollVote(p.id, user.uid);
        if (v) votes[p.id] = v.vote;
      }));
      setPollVotes(votes);
    }

    // Load recent activity (last 5 items for widget)
    try {
      const acts = await getRecentActivity(5);
      setRecentActivity(acts);
    } catch {}

    setLoading(false);
  }

  useEffect(() => { load(); }, [activeGroupId]);

  const predMap = {};
  predictions.forEach((p) => { predMap[p.matchId] = p; });

  // Same group filter as Matches page
  const groupMatches = matches.filter((m) => {
    if (!activeGroupId) return !!user?.isAdmin;
    if (m.groupIds?.length > 0) return m.groupIds.includes(activeGroupId);
    if (m.status !== 'completed') return true;
    return false;
  });

  const upcoming = groupMatches.filter((m) => m.status === 'upcoming').slice(0, 3);
  const live = groupMatches.filter((m) => m.status === 'live');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="spinner" />
      </div>
    );
  }

  const firstName = user.displayName?.split(' ')[0] || 'there';

  // No group yet — show waiting message
  if (!user?.isAdmin && myGroups.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
        <h1 className="text-[26px] font-bold tracking-tight mb-8" style={{ color: 'var(--c-t1)' }}>
          Welcome, {firstName} 👋
        </h1>
        <div className="rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="text-4xl">👋</div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--c-t1)' }}>You're not in a group yet</div>
          <p className="text-[13px]" style={{ color: 'var(--c-t2)' }}>
            Ask your group admin to add you. Once added, you'll see your community's polls here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 space-y-7 animate-fade-in">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--c-t3)' }}>
            Welcome back
          </p>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
            {firstName} 👋
          </h1>
        </div>
        {rank != null && (
          <div className="rounded-2xl px-4 py-2.5 text-center"
            style={{ background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-bd)', transition: 'background 0.2s, border-color 0.2s' }}>
            <div className="text-xl font-bold" style={{ color: 'var(--c-gold)' }}>#{rank}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--c-t3)' }}>
              Your Rank
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <UserStatsCard stats={userStats} rank={rank} />

      {/* Live matches */}
      {live.length > 0 && (
        <section className="animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--c-t1)' }}>Live Now</h2>
          </div>
          <div className="space-y-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} userPrediction={predMap[m.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--c-t1)' }}>Upcoming Matches</h2>
          <Link to="/matches" className="text-[13px] font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--c-primary)' }}>
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl py-12 flex flex-col items-center gap-2"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
            <span className="text-3xl">📅</span>
            <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No upcoming matches scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} userPrediction={predMap[m.id]} onPredictionSaved={load} />
            ))}
          </div>
        )}
      </section>

      {/* Recent polls */}
      {openPolls.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--c-t1)' }}>Open Polls</h2>
            <Link to="/polls" className="text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--c-primary)' }}>View all →</Link>
          </div>
          <div className="space-y-3">
            {openPolls.map((poll) => {
              const userVote = pollVotes[poll.id];
              return (
                <div key={poll.id} className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', transition: 'background 0.2s, border-color 0.2s' }}>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--c-t1)' }}>{poll.question}</p>
                  {userVote ? (
                    <div className="text-[12px] px-3 py-2 rounded-xl"
                      style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}>
                      ✓ You voted: <strong>{userVote}</strong>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {poll.options.slice(0, 3).map((opt) => (
                        <button key={opt} disabled={votingPoll === poll.id}
                          onClick={async () => {
                            setVotingPoll(poll.id);
                            try {
                              await castVote(poll.id, user.uid, opt);
                              setPollVotes((prev) => ({ ...prev, [poll.id]: opt }));
                            } catch {}
                            finally { setVotingPoll(null); }
                          }}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50"
                          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}>
                          {opt}
                        </button>
                      ))}
                      {poll.options.length > 3 && (
                        <Link to="/polls" className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}>
                          +{poll.options.length - 3} more →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Activity widget */}
      {recentActivity.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--c-t1)' }}>Recent Activity</h2>
            <Link to="/activity" className="text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--c-primary)' }}>See all →</Link>
          </div>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', transition: 'background 0.2s, border-color 0.2s' }}>
            {recentActivity.map((a, i) => {
              const label = (() => {
                if (a.type === 'poll_vote') return `${a.displayName} voted on "${a.pollQuestion}"`;
                if (a.type === 'prediction') return `${a.displayName} made a prediction`;
                if (a.type === 'member_join') return `${a.displayName} joined ${a.groupName}`;
                if (a.type === 'poll_created') return `New poll: "${a.pollQuestion}"`;
                return a.type;
              })();
              const icon = { poll_vote: '📊', prediction: '⚽', member_join: '👋', poll_created: '📝' }[a.type] || '•';
              const ts = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
              const mins = Math.floor((Date.now() - ts.getTime()) / 60000);
              const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--c-border)' : 'none' }}>
                  <span className="text-base w-6 flex-shrink-0 text-center">{icon}</span>
                  <p className="flex-1 text-[12px] leading-snug truncate" style={{ color: 'var(--c-t2)' }}>{label}</p>
                  <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--c-t3)' }}>{ago}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/leaderboard"
          className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', transition: 'background 0.2s, border-color 0.2s' }}>
          <span className="text-3xl">🏆</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--c-primary)' }}>Leaderboard</span>
        </Link>
        <Link to="/my-predictions"
          className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-bd)', transition: 'background 0.2s, border-color 0.2s' }}>
          <span className="text-3xl">📋</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--c-gold)' }}>My Predictions</span>
        </Link>
        <Link to="/discover"
          className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', transition: 'background 0.2s, border-color 0.2s' }}>
          <span className="text-3xl">🌍</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--c-green)' }}>Discover</span>
        </Link>
        <Link to="/activity"
          className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', transition: 'background 0.2s, border-color 0.2s' }}>
          <span className="text-3xl">📡</span>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--c-t2)' }}>Activity</span>
        </Link>
      </div>
    </div>
  );
}
