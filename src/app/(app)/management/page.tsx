'use client';

import { useState } from 'react';
import UsersTab from './UsersTab';
import DrugManagementTab from './DrugManagementTab';
import SettingsTab from './SettingsTab';

const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'drugs', label: 'Drug Management' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users');

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-4">Management</h1>

      {/* Tab bar */}
      <div className="flex border-b border-card-border mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'drugs' && <DrugManagementTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}
