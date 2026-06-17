import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getPolls, getPollVotes, castVote, getUserPollVote, getAllUsers, logActivity } from '../firebase/services';

function VoteBar({ option, count, total, isResult, isUserVote }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium flex items-center gap-1.5" style={{ color: isResult ? 'var(--c-green)' : 'var(--c-t1)' }}>
          {isResult && '✓ '}
          {option}
          {isUserVote && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: 'var(--c-primary-bg)', color: 'var(--c-primary)', border: '1px solid var(--c-primary-bd)' }}>
            Your pick
          </span>}
        </span>
        <span style={{ color: 'var(--c-t3)' }}>{count} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isResult ? 'var(--c-green)' : isUserVote ? 'var(--c-primary)' : 'var(--c-border-s)',
          }}
        />
      </div>
    </div>
  );
}

function PollLeaderboard({ votes, result, options }) {
  const correct = votes.filter((v) => v.vote === result);
  const wrong = votes.filter((v) => v.vote !== result);
  if (correct.length === 0) return null;
  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--c-border)' }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--c-t3)' }}>
        Who got it right ({correct.length}/{votes.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {correct.map((v) => (
          <span key={v.id} className="text-[12px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'var(--c-green-bg)', border: '1px solid var(--c-green-bd)', color: 'var(--c-green)' }}>
            ✓ {v.displayName || v.userId}
          </span>
        ))}
        {wrong.map((v) => (
          <span key={v.id} className="text-[12px] px-2.5 py-1 rounded-full"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }}>
            {v.displayName || v.userId}
          </span>
        ))}
      </div>
    </div>
  );
}

function PollCard({ poll, userId, allUsers }) {
  const [userVote, setUserVote] = useState(null);
  const [votes, setVotes] = useState([]);
  const [voting, setVoting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [customAnswer, setCustomAnswer] = useState('');

  useEffect(() => {
    async function load() {
      const [allVotes, myVote] = await Promise.all([
        getPollVotes(poll.id),
        getUserPollVote(poll.id, userId),
      ]);
      // attach display names
      const enriched = allVotes.map((v) => ({
        ...v,
        displayName: allUsers.find((u) => (u.uid || u.id) === v.userId)?.displayName || v.userId,
      }));
      setVotes(enriched);
      setUserVote(myVote?.vote || null);
      setLoaded(true);
    }
    load();
  }, [poll.id, userId]);

  async function handleVote(option) {
    if (voting || userVote || poll.status !== 'open') return;
    setVoting(true);
    try {
      await castVote(poll.id, userId, option);
      const displayName = allUsers.find((u) => (u.uid || u.id) === userId)?.displayName || userId;
      setUserVote(option);
      setVotes((prev) => [...prev, { id: Date.now(), pollId: poll.id, userId, vote: option, displayName }]);
      logActivity('poll_vote', {
        userId,
        displayName,
        pollId: poll.id,
        pollQuestion: poll.question,
        groupId: poll.groupId,
      });
    } catch {}
    finally { setVoting(false); }
  }

  const total = votes.length;
  const isClosed = poll.status === 'closed';
  const hasResult = poll.type === 'prediction' && poll.result;
  const canSeeResults =
    poll.showResults === 'always' ||
    (poll.showResults === 'after_vote' && userVote) ||
    (poll.showResults === 'after_close' && isClosed);

  const isPastDeadline = poll.deadline?.toDate && new Date() > poll.deadline.toDate();
  const effectivelyClosed = isClosed || isPastDeadline;

  const STATUS_LABEL = hasResult ? 'Result In' : effectivelyClosed ? 'Closed' : 'Open';
  const STATUS_COLOR = hasResult ? 'var(--c-green)' : effectivelyClosed ? 'var(--c-t3)' : 'var(--c-primary)';
  const STATUS_BG = hasResult ? 'var(--c-green-bg)' : effectivelyClosed ? 'var(--c-surface)' : 'var(--c-primary-bg)';
  const STATUS_BD = hasResult ? 'var(--c-green-bd)' : effectivelyClosed ? 'var(--c-border)' : 'var(--c-primary-bd)';

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', transition: 'background 0.2s, border-color 0.2s' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--c-t1)' }}>{poll.question}</p>
        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
          style={{ background: STATUS_BG, border: `1px solid ${STATUS_BD}`, color: STATUS_COLOR }}>
          {STATUS_LABEL}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--c-t3)' }}>
        <span>{poll.type === 'prediction' ? '🎯 Prediction' : '📊 Opinion'}</span>
        <span>·</span>
        <span>{total} vote{total !== 1 ? 's' : ''}</span>
        {poll.deadline && (
          <>
            <span>·</span>
            <span>Closes {poll.deadline.toDate?.().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </>
        )}
      </div>

      {/* Voting or results */}
      {!loaded ? (
        <div className="py-4 flex justify-center"><div className="spinner" /></div>
      ) : !userVote && !effectivelyClosed ? (
        /* Vote buttons + optional custom answer */
        <div className="space-y-2">
          {poll.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleVote(opt)}
              disabled={voting}
              className="w-full py-2.5 px-4 rounded-xl text-[13px] font-medium text-left transition-all duration-150 disabled:opacity-50"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-primary-bd)'; e.currentTarget.style.color = 'var(--c-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-t1)'; }}
            >
              {opt}
            </button>
          ))}
          {poll.allowCustomOptions && (
            <div className="flex gap-2 pt-1">
              <input
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customAnswer.trim() && handleVote(customAnswer.trim())}
                placeholder="Or type your own answer…"
                disabled={voting}
                className="flex-1 py-2.5 px-4 rounded-xl text-[13px]"
                style={{ background: 'var(--c-surface)', border: '1px dashed var(--c-border-s)', color: 'var(--c-t1)', outline: 'none' }}
              />
              <button
                onClick={() => customAnswer.trim() && handleVote(customAnswer.trim())}
                disabled={voting || !customAnswer.trim()}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-40 transition-all"
                style={{ background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }}
              >
                Vote
              </button>
            </div>
          )}
        </div>
      ) : canSeeResults ? (
        /* Results bars — includes custom answers */
        <div className="space-y-3">
          {[...new Set([...poll.options, ...votes.map((v) => v.vote)])].map((opt) => {
            const count = votes.filter((v) => v.vote === opt).length;
            if (count === 0 && !poll.options.includes(opt)) return null;
            return (
              <VoteBar
                key={opt}
                option={opt}
                count={count}
                total={total}
                isResult={hasResult && poll.result === opt}
                isUserVote={userVote === opt}
              />
            );
          })}
        </div>
      ) : (
        /* Voted but results hidden until close */
        <div className="py-3 rounded-xl text-center text-[13px]"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t2)' }}>
          ✓ You voted <strong style={{ color: 'var(--c-primary)' }}>{userVote}</strong> — results shown after poll closes
        </div>
      )}

      {/* Prediction leaderboard */}
      {hasResult && canSeeResults && (
        <PollLeaderboard votes={votes} result={poll.result} options={poll.options} />
      )}
    </div>
  );
}

export default function Polls() {
  const { user } = useAuth();
  const { activeGroup, activeGroupId, myGroups } = useGroup();
  const [polls, setPolls] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroupId) { setPolls([]); setLoading(false); return; }
    async function load() {
      setLoading(true);
      const [pollData, users] = await Promise.all([getPolls(activeGroupId), getAllUsers()]);
      setPolls(pollData);
      setAllUsers(users);
      setLoading(false);
    }
    load();
  }, [activeGroupId]);

  if (!activeGroupId && !user?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-7 animate-fade-in">
        <div className="rounded-2xl p-8 text-center space-y-3"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <div className="text-4xl">📊</div>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--c-t1)' }}>No group selected</p>
          <p className="text-[13px]" style={{ color: 'var(--c-t2)' }}>Join a group to see polls.</p>
        </div>
      </div>
    );
  }

  const open = polls.filter((p) => p.status === 'open');
  const completed = polls.filter((p) => p.status === 'closed' && p.result);
  const closed = polls.filter((p) => p.status === 'closed' && !p.result);

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 space-y-7 animate-fade-in">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>Polls</h1>
        {activeGroup && (
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{activeGroup.name}</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="spinner" /></div>
      ) : polls.length === 0 ? (
        <div className="rounded-2xl py-16 flex flex-col items-center gap-3"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <span className="text-4xl">📊</span>
          <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>No polls yet — check back soon</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>
                🟢 Open · {open.length}
              </h2>
              {open.map((p) => <PollCard key={p.id} poll={p} userId={user.uid} allUsers={allUsers} />)}
            </section>
          )}
          {completed.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>
                ✅ Completed · {completed.length}
              </h2>
              {completed.map((p) => <PollCard key={p.id} poll={p} userId={user.uid} allUsers={allUsers} />)}
            </section>
          )}
          {closed.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-t3)' }}>
                🔒 Closed · {closed.length}
              </h2>
              {closed.map((p) => <PollCard key={p.id} poll={p} userId={user.uid} allUsers={allUsers} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
