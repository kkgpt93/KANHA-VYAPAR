import React from 'react';
import {
  Bell,
  Sun,
  Moon,
  WifiOff,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';

interface TopNavProps {
  onOpenNotifications: () => void;
  onLockTerminal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenNotifications,
  onLockTerminal,
}) => {
  const {
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleDarkMode,
    isOffline,
    notifications,
    activeUser,
  } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: 'pos', label: 'POS Billing' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'customers', label: 'Customers' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'analytics', label: 'Reports' },
    { id: 'users', label: 'Team Roles' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#pos"
          onClick={e => {
            e.preventDefault();
            setActiveTab('pos');
          }}
          className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          VyaparPOS
        </a>

        {/* Offline indicator when disconnected */}
        {isOffline && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md">
            <WifiOff className="w-3 h-3" /> Offline Mode
          </span>
        )}
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">
        {navLinks.map(link => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2">
        {/* Real-time Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          title="Stock & Sales Alerts"
          className="relative p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900" />
          )}
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          title="Toggle Theme"
          className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Active Operator & Terminal Lock Button */}
        <button
          onClick={onLockTerminal}
          className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          title={`Active User: ${activeUser.name} (${activeUser.role}). Click to lock.`}
        >
          <span className={`w-2 h-2 rounded-full ${activeUser.avatarColor || 'bg-emerald-500'}`} />
          <span className="truncate max-w-[90px] sm:max-w-[120px] hidden sm:inline">
            {activeUser.name.split(' ')[0]}
          </span>
          <Lock className="w-3 h-3 text-neutral-400" />
        </button>
      </div>
    </header>
  );
};
