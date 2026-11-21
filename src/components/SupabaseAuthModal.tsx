import React, { useState } from 'react';
import { Cloud, Eye, EyeOff, Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({ isOpen, onClose }) => {
  const {
    isSupabaseConfigured,
    authBusy,
    authError,
    authNotice,
    clearAuthError,
    clearAuthNotice,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      const ok = await signInWithEmail(email, password);
      if (ok) onClose();
    } else {
      await signUpWithEmail(email, password, fullName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 brand-command-surface text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 brand-gold-text" />
            <div>
              <h3 className="text-sm font-bold">Supabase Cloud Account</h3>
              <p className="text-[11px] text-white/75">
                Multi-Device Store Sync & Secure RLS Backup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!isSupabaseConfigured && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Supabase अभी कनेक्ट नहीं है। क्लाउड सिंक शुरू करने के लिए अपने{' '}
              <code className="font-mono font-semibold">.env</code> में{' '}
              <code className="font-mono font-semibold">VITE_SUPABASE_URL</code> और{' '}
              <code className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code> जोड़ें।
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearAuthError();
                clearAuthNotice();
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearAuthError();
                clearAuthNotice();
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Store Owner Name
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your Name / Shop Name"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="store@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {authError}
              </div>
            )}

            {authNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
                {authNotice}
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              {authBusy
                ? 'Please wait...'
                : mode === 'signin'
                ? 'Sign In with Supabase'
                : 'Create Supabase Account'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="grow border-t border-neutral-200 dark:border-neutral-800" />
            <span className="shrink mx-3 text-[11px] text-neutral-400">or</span>
            <div className="grow border-t border-neutral-200 dark:border-neutral-800" />
          </div>

          <button
            type="button"
            disabled={authBusy}
            onClick={() => void signInWithGoogle()}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100 transition-colors cursor-pointer disabled:opacity-60"
          >
            Continue with Google (Supabase OAuth)
          </button>
        </div>
      </div>
    </div>
  );
};
