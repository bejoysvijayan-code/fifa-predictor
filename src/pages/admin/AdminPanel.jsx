import { useState } from 'react';
import ManageMatches from './ManageMatches';
import ManageResults from './ManageResults';
import ImportMatch from './ImportMatch';
import ManageUsers from './ManageUsers';
import QuickAdd from './QuickAdd';

const TABS = ['Matches', 'Results', 'Import', 'Users', 'Schedule'];

export default function AdminPanel() {
  const [tab, setTab] = useState('Matches');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">⚙️</span>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-fifa-gold text-gray-900'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t === 'Import' ? '📥 Import' : t === 'Schedule' ? '📅 Schedule' : t}
          </button>
        ))}
      </div>

      {tab === 'Matches' && <ManageMatches />}
      {tab === 'Results' && <ManageResults />}
      {tab === 'Import' && <ImportMatch />}
      {tab === 'Users' && <ManageUsers />}
      {tab === 'Schedule' && <QuickAdd />}
    </div>
  );
}
