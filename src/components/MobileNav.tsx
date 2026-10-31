import React from 'react';
import {
  ShoppingBag,
  Package,
  FileText,
  BarChart3,
  Users,
  Settings,
  Contact,
  KeyRound,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveTab } from '../types';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, cart } = useApp();

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'pos',
      label: 'Billing',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: cart.length > 0 ? cart.reduce((s, i) => s + i.quantity, 0) : undefined,
    },
    { id: 'setup', label: 'Add Data', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'inventory', label: 'Stock', icon: <Package className="w-4 h-4" /> },
    { id: 'customers', label: 'Clients', icon: <Contact className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'license', label: 'License', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="md:hidden sticky bottom-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-2 py-1 flex items-center justify-around select-none no-print">
      {tabs.map(t => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <div className="relative">
              {t.icon}
              {t.badge && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center font-mono">
                  {t.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
