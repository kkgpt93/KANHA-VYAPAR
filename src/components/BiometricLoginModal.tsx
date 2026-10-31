import React, { useState } from 'react';
import {
  Fingerprint,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BiometricLoginModal: React.FC = () => {
  const {
    isLocked,
    activeUser,
    users,
    switchUser,
    unlockWithPin,
    unlockWithBiometrics,
  } = useApp();

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  if (!isLocked) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = unlockWithPin(pin);
    if (success) {
      setPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleBiometricClick = async () => {
    setIsScanning(true);
    // Simulate high-fidelity touch sensor scanning duration (500ms)
    setTimeout(async () => {
      const ok = await unlockWithBiometrics();
      if (ok) {
        setScanSuccess(true);
        setTimeout(() => {
          setIsScanning(false);
          setScanSuccess(false);
        }, 500);
      } else {
        setIsScanning(false);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center space-y-6">
        {/* User Identity Avatar */}
        <div className="flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-2xl ${activeUser.avatarColor || 'bg-emerald-600'} text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-3`}
          >
            {activeUser.name.charAt(0)}
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {activeUser.name}
          </h2>
          <p className="text-xs text-neutral-500 uppercase font-mono tracking-wider mt-0.5">
            {activeUser.role} · Terminal Locked
          </p>
        </div>

        {/* Interactive Biometric Fingerprint Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleBiometricClick}
            disabled={isScanning}
            className={`relative p-5 rounded-full border-2 transition-all group ${
              scanSuccess
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                : isScanning
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-500 animate-pulse'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600'
            }`}
          >
            <Fingerprint className="w-12 h-12" />
            {isScanning && (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
            )}
          </button>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
            {isScanning
              ? 'Verifying Biometrics...'
              : scanSuccess
              ? 'Biometric Verified!'
              : 'Touch Fingerprint to Unlock'}
          </span>
        </div>

        {/* PIN Entry Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white dark:bg-neutral-900 px-2 text-neutral-400 font-mono">
              Or Enter PIN
            </span>
          </div>
        </div>

        {/* PIN Form */}
        <form onSubmit={handlePinSubmit} className="space-y-3">
          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={e => {
              setPin(e.target.value);
              setPinError(false);
            }}
            placeholder="Enter 4-Digit PIN"
            className="w-full text-center tracking-widest text-lg font-mono py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />

          {pinError && (
            <p className="text-xs text-rose-600 font-medium">
              Incorrect security PIN. Default is 1234.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            Unlock Terminal
          </button>
        </form>

        {/* Switch Operator */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-[11px] text-neutral-400 mb-1.5">Switch Staff Account:</div>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  switchUser(u);
                  setPin('');
                  setPinError(false);
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  u.id === activeUser.id
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                {u.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
