import React, { useState } from 'react';
import {
  Users,
  Shield,
  Fingerprint,
  Key,
  Plus,
  Trash2,
  Check,
  X,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, RoleType } from '../types';

export const UserManagement: React.FC = () => {
  const {
    users,
    activeUser,
    switchUser,
    addUser,
    deleteUser,
    registerBiometricsForUser,
  } = useApp();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('cashier');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [pinPromptUser, setPinPromptUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const roleDescriptions: Record<RoleType, { label: string; desc: string; access: string }> = {
    admin: {
      label: 'Admin / Owner',
      desc: 'Complete control over billing, inventory, team, financial reports and system backup.',
      access: 'Full Access (All Modules)',
    },
    manager: {
      label: 'Store Manager',
      desc: 'Manage inventory, process refunds, view reports, and operate POS billing terminal.',
      access: 'POS, Inventory, Invoices & Reports',
    },
    cashier: {
      label: 'Billing Cashier',
      desc: 'Optimized for high-speed POS billing, barcode checkout, and customer receipt generation.',
      access: 'POS Billing Terminal Only',
    },
    inventory_clerk: {
      label: 'Inventory Clerk',
      desc: 'Manage stock arrivals, adjust stock quantities, add menu items and monitor low stock alerts.',
      access: 'Inventory Catalog & Stock Control',
    },
  };

  const handleSwitchClick = (u: User) => {
    if (u.id === activeUser.id) return;
    setPinPromptUser(u);
    setPinInput('');
    setPinError(false);
  };

  const handleConfirmPinSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptUser) return;

    if (pinInput === pinPromptUser.pin || pinInput === '1234') {
      switchUser(pinPromptUser);
      setPinPromptUser(null);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || newUserPin.length < 4) return;

    const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim() || `${newUserName.toLowerCase().replace(/\s+/g, '')}@vyaparmart.in`,
      role: newUserRole,
      pin: newUserPin,
      avatarColor: randomColor,
      hasBiometrics: false,
    });

    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPin('1234');
  };

  const handleToggleBiometrics = async (userId: string) => {
    await registerBiometricsForUser(userId);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Role-Based Access Control & Team Management
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Active operator: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{activeUser.name}</span> ({roleDescriptions[activeUser.role].label})
          </p>
        </div>

        {activeUser.role === 'admin' && (
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      <div className="p-4 lg:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Team Members List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Staff Accounts & Operators
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {users.map(u => {
              const isActive = u.id === activeUser.id;
              const roleMeta = roleDescriptions[u.role];

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-white dark:bg-neutral-900 border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${u.avatarColor || 'bg-emerald-600'} text-white flex items-center justify-center font-bold text-sm`}
                      >
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                            {u.name}
                          </h4>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-md">
                              Active Now
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {roleMeta.label} · <span className="font-mono">{u.email}</span>
                        </p>
                      </div>
                    </div>

                    {/* Delete button if admin and not only user */}
                    {activeUser.role === 'admin' && users.length > 1 && !isActive && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${u.name}?`)) deleteUser(u.id);
                        }}
                        className="text-neutral-400 hover:text-rose-600 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <span className="font-mono text-[11px]">PIN: ****</span>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleBiometrics(u.id)}
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          u.hasBiometrics ? 'text-emerald-600 font-medium' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                        title="Touch ID / Face ID Biometrics"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>{u.hasBiometrics ? 'Biometrics Active' : 'Enable Touch ID'}</span>
                      </button>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => handleSwitchClick(u)}
                        className="px-3 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        Switch To User
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roles & Permissions Matrix */}
        <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Role Permissions Overview
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {(Object.keys(roleDescriptions) as RoleType[]).map(r => {
              const meta = roleDescriptions[r];
              return (
                <div
                  key={r}
                  className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60"
                >
                  <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                    {meta.label}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {meta.desc}
                  </p>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    {meta.access}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Switch User PIN Modal */}
      {pinPromptUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-sm w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Switch to {pinPromptUser.name}
              </h3>
              <button
                onClick={() => setPinPromptUser(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Enter 4-digit security PIN for this staff member (Default: 1234 or user PIN)
            </p>

            <form onSubmit={handleConfirmPinSwitch} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter PIN"
                className="w-full text-center tracking-widest text-lg font-mono py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
              />

              {pinError && (
                <p className="text-xs text-rose-600 text-center font-medium">
                  Invalid security PIN. Try again.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinPromptUser(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Verify & Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Add New Staff Member
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Assigned Role *
                </label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as RoleType)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                >
                  <option value="cashier">Billing Cashier</option>
                  <option value="manager">Store Manager</option>
                  <option value="inventory_clerk">Inventory Clerk</option>
                  <option value="admin">Admin / Owner</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="staff@vyaparmart.in"
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    4-Digit PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={newUserPin}
                    onChange={e => setNewUserPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 text-xs font-mono text-center bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
