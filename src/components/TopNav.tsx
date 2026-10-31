import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  WifiOff,
  Lock,
  Palette,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';
import { COLOR_THEMES } from '../utils/themes';

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
    colorTheme,
    setColorTheme,
    isOffline,
    notifications,
    activeUser,
  } = useApp();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: 'pos', label: 'POS Billing' },
    { id: 'setup', label: '+ Add Data' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'customers', label: 'Customers' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'analytics', label: 'Reports' },
    { id: 'users', label: 'Team Roles' },
    { id: 'license', label: 'License' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 lg:px-6 py-3 brand-command-surface text-white border-b shadow-xs select-none no-print">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#pos"
          onClick={e => {
            e.preventDefault();
            setActiveTab('pos');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Vyapar<span className="brand-gold-text">POS</span>
        </a>

        {isOffline && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-amber-300 whitespace-nowrap">
            <WifiOff className="w-3.5 h-3.5" /> Offline
          </span>
        )}
      </div>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 overflow-x-auto">
        {navLinks.map(link => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => setActiveTab(link.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'brand-active-tab shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Palette, Notifications & Operator Lock */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Signature Theme Palette Switcher */}
        <div className="relative" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setIsThemeMenuOpen(prev => !prev)}
            title="Choose Signature Color Theme"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/18 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Palette className="w-3.5 h-3.5 brand-gold-text" />
            <span className="hidden xl:inline">Theme</span>
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 p-3 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <div className="text-xs font-bold">Signature Color Themes</div>
                  <div className="text-[11px] text-neutral-500">ऐप का विशेष कलर मूड चुनें</div>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{isDarkMode ? 'Light' : 'Dark'}</span>
                </button>
              </div>

              <div className="space-y-1">
                {COLOR_THEMES.map(theme => {
                  const selected = colorTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setColorTheme(theme.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center -space-x-1 shrink-0">
                          <span
                            className="w-4 h-4 rounded-full border border-white/60"
                            style={{ backgroundColor: theme.commandHex }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white/60"
                            style={{ backgroundColor: theme.accentHex }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/60"
                            style={{ backgroundColor: theme.highlightHex }}
                          />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{theme.name}</div>
                          <div className="text-[10px] text-neutral-500 truncate">{theme.nameHindi}</div>
                        </div>
                      </div>
                      {selected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Notifications Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          title="Stock & Sales Alerts"
          className="relative p-2 text-white/85 hover:text-white hover:bg-white/12 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold font-mono flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dark/Light mode toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          title="Toggle Light / Dark Mode"
          className="p-2 text-white/85 hover:text-white hover:bg-white/12 rounded-lg transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Active Operator & Terminal Lock Button */}
        <button
          type="button"
          onClick={onLockTerminal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-white/12 hover:bg-white/20 border border-white/15 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title={`Active User: ${activeUser.name} (${activeUser.role}). Click to lock.`}
        >
          <Lock className="w-3.5 h-3.5 brand-gold-text" />
          <span className="truncate max-w-[90px] sm:max-w-[120px] hidden sm:inline">
            {activeUser.name.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
};
