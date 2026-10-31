import React from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  ShoppingBag,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NotificationItem } from '../types';
import { formatDateTime } from '../utils/formatters';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, markNotificationRead, clearNotifications } = useApp();

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'sale':
        return <ShoppingBag className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-neutral-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Live Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
                {unreadCount}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950/40 flex items-center justify-between text-xs text-neutral-500">
            <span>{notifications.length} Total Alerts</span>
            <button
              onClick={clearNotifications}
              className="hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* List of alerts */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 p-2">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-neutral-400">
              <Bell className="w-8 h-8 mb-2 opacity-30 stroke-1" />
              <p className="text-xs font-medium text-neutral-500">No notifications yet</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Stock alerts and sales notifications will appear here in real-time
              </p>
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item.id}
                onClick={() => markNotificationRead(item.id)}
                className={`p-3 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                  item.read
                    ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 opacity-75'
                    : 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-l-2 border-emerald-500'
                }`}
              >
                {getIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {item.title}
                    </h5>
                    {!item.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
