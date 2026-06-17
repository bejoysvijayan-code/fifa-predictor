import { useEffect, useState } from 'react';
import { getRecentActivity } from '../firebase/services';

const FILTERS = ['All', 'Votes', 'Predictions', 'Joins'];
const TYPE_MAP = { Votes: 'poll_vote', Predictions: 'prediction', Joins: 'member_join' };

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function activityIcon(type) {
  if (type === 'poll_vote') return '📊';
  if (type === 'prediction') return '⚽';
  if (type === 'member_join') return '👋';
  if (type === 'poll_created') return '📝';
  return '•';
}

function activityLabel(a) {
  if (a.type === 'poll_vote') return <><strong>{a.displayName}</strong> voted on <em>"{a.pollQuestion}"</em></>;
  if (a.type === 'prediction') return <><strong>{a.displayName}</strong> made a match prediction</>;
  if (a.type === 'member_join') return <><strong>{a.displayName}</strong> joined <em>{a.groupName}</em></>;
  if (a.type === 'poll_created') return <>New poll created: <em>"{a.pollQuestion}"</em></>;
  return a.type;
}

export default function Activity() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    getRecentActivity(100)
      .then((a) => { setActivity(a); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'All'
    ? activity
    : activity.filter((a) => a.type === TYPE_MAP[filter]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-7 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
          Recent Activity
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--c-t3)' }}>Last 48 hours</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = f === 'All' ? activity.length : activity.filter((a) => a.type === TYPE_MAP[f]).length;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-150"
              style={
                active
                  ? { background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-bd)', color: 'var(--c-primary)' }
                  : { background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-t3)' }
              }
            >
              {f}
              {count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'var(--c-primary-bd)' : 'var(--c-border)',
                    color: active ? 'var(--c-primary)' : 'var(--c-t3)',
                  }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-16 flex flex-col items-center gap-3"
          style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          <span className="text-4xl">🗓️</span>
          <p className="text-[13px]" style={{ color: 'var(--c-t3)' }}>
            {activity.length === 0 ? 'No activity in the last 48 hours' : 'No activity matching this filter'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', background: 'var(--c-card)' }}>
          {filtered.map((a, i) => (
            <div
              key={a.id}
              className="flex items-start gap-3 px-4 py-3"
              style={{
                borderTop: i > 0 ? '1px solid var(--c-border)' : 'none',
              }}
            >
              <div className="text-xl w-8 flex-shrink-0 text-center mt-0.5">
                {activityIcon(a.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-snug" style={{ color: 'var(--c-t2)' }}>
                  {activityLabel(a)}
                </p>
                {a.groupName && a.type !== 'member_join' && (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--c-t3)' }}>{a.groupName}</p>
                )}
              </div>
              <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--c-t3)' }}>
                {timeAgo(a.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
