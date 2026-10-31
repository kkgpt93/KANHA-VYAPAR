import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Lock,
  Trash2,
  ExternalLink,
  Calendar,
  Clock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatLicenseKeyInput } from '../utils/license';
import { formatDate, formatDateTime } from '../utils/formatters';

export const LicenseManager: React.FC = () => {
  const {
    licenseState,
    licenseEvaluation,
    activateLicenseKey,
    generatedKeys,
    generateNewLicenseKey,
    deleteGeneratedKey,
    creatorConfig,
    updateCreatorConfig,
    verifyCreatorCredentials,
    updateCreatorCredentials,
    simulateLicenseExpiry,
    simulateLicenseExpiringSoon,
    settings,
  } = useApp();

  const [subTab, setSubTab] = useState<'status' | 'keygen'>('status');

  // Renewal input state
  const [renewalKey, setRenewalKey] = useState('');
  const [renewalFeedback, setRenewalFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedInstallId, setCopiedInstallId] = useState(false);

  // Exclusive Creator authentication state (Creator ID + Password)
  const [isCreatorUnlocked, setIsCreatorUnlocked] = useState(false);
  const [creatorIdInput, setCreatorIdInput] = useState('');
  const [creatorPasswordInput, setCreatorPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [creatorAuthError, setCreatorAuthError] = useState('');

  // Key generator form state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [durationPreset, setDurationPreset] = useState<string>('365');
  const [customDays, setCustomDays] = useState<number>(365);
  const [lockMode, setLockMode] = useState<'universal' | 'device'>('device');
  const [targetInstallId, setTargetInstallId] = useState(licenseState.installationId);
  const [keyNotes, setKeyNotes] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Vendor Contact config form
  const [vendorNameInput, setVendorNameInput] = useState(creatorConfig.vendorName);
  const [vendorPhoneInput, setVendorPhoneInput] = useState(creatorConfig.vendorPhone);
  const [vendorSavedMsg, setVendorSavedMsg] = useState<string | null>(null);

  // Creator ID & Password rotation form
  const [currentCreatorPass, setCurrentCreatorPass] = useState('');
  const [newCreatorId, setNewCreatorId] = useState('');
  const [newCreatorPass, setNewCreatorPass] = useState('');
  const [confirmNewCreatorPass, setConfirmNewCreatorPass] = useState('');
  const [showSecurityPasswords, setShowSecurityPasswords] = useState(false);
  const [credentialFeedback, setCredentialFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleCopyInstallId = async () => {
    try {
      await navigator.clipboard.writeText(licenseState.installationId);
      setCopiedInstallId(true);
      setTimeout(() => setCopiedInstallId(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyKey = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleRenewalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalKey.trim()) {
      setRenewalFeedback({
        type: 'error',
        text: 'कृपया नई वार्षिक लाइसेंस की (License Key) दर्ज करें।',
      });
      return;
    }

    const res = activateLicenseKey(renewalKey);
    if (res.ok) {
      setRenewalFeedback({ type: 'success', text: res.message });
      setRenewalKey('');
    } else {
      setRenewalFeedback({ type: 'error', text: res.message });
    }
  };

  const handleCreatorLogout = () => {
    setIsCreatorUnlocked(false);
    setCreatorIdInput('');
    setCreatorPasswordInput('');
    setShowLoginPassword(false);
    setCreatorAuthError('');
    setCurrentCreatorPass('');
    setNewCreatorId('');
    setNewCreatorPass('');
    setConfirmNewCreatorPass('');
    setCredentialFeedback(null);
  };

  const handleCreatorUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyCreatorCredentials(creatorIdInput, creatorPasswordInput);
    if (res.ok) {
      setIsCreatorUnlocked(true);
      setCreatorIdInput('');
      setCreatorPasswordInput('');
      setShowLoginPassword(false);
      setCreatorAuthError('');
    } else {
      setCreatorAuthError(
        res.error || 'अमान्य क्रिएटर ID या पासवर्ड (Invalid Creator Credentials)।'
      );
    }
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const days =
      durationPreset === 'custom'
        ? Math.max(1, Math.min(3650, Number(customDays) || 365))
        : Number(durationPreset);

    const record = generateNewLicenseKey({
      clientName: clientName.trim() || settings.storeName || 'Retail Store Client',
      clientPhone: clientPhone.trim(),
      durationDays: days,
      targetInstallationId: lockMode === 'device' ? targetInstallId.trim() : '',
      notes: keyNotes.trim(),
    });

    setNewlyCreatedKey(record.licenseKey);
    setClientName('');
    setKeyNotes('');
  };

  const handleSaveVendorContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreatorConfig({
      vendorName: vendorNameInput.trim() || 'VyaparPOS Software Admin',
      vendorPhone: vendorPhoneInput.trim(),
    });
    setVendorSavedMsg('सॉफ्टवेयर प्रदाता संपर्क विवरण सेव हो गया!');
    setTimeout(() => setVendorSavedMsg(null), 3000);
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCreatorPass.trim() && newCreatorPass.trim() !== confirmNewCreatorPass.trim()) {
      setCredentialFeedback({
        type: 'error',
        text: 'नया पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खाते (Passwords do not match)।',
      });
      return;
    }

    const res = updateCreatorCredentials({
      currentPassword: currentCreatorPass,
      newCreatorId,
      newPassword: newCreatorPass,
    });

    if (res.ok) {
      setCredentialFeedback({ type: 'success', text: res.message });
      setCurrentCreatorPass('');
      setNewCreatorId('');
      setNewCreatorPass('');
      setConfirmNewCreatorPass('');
    } else {
      setCredentialFeedback({ type: 'error', text: res.message });
    }
  };

  const filteredKeys = generatedKeys.filter(k => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      k.clientName.toLowerCase().includes(q) ||
      k.licenseKey.toLowerCase().includes(q) ||
      (k.targetInstallationId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* Header with Segmented Workspace Switcher */}
      <div className="px-4 lg:px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Annual Software License & Creator Console
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            1-Year subscription validity, annual key renewal, and restricted creator keygen console
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            type="button"
            onClick={() => {
              handleCreatorLogout();
              setSubTab('status');
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              subTab === 'status'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Store License & Renewal
          </button>
          <button
            type="button"
            onClick={() => setSubTab('keygen')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'keygen'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Creator Console</span>
          </button>
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-6">
        {subTab === 'status' ? (
          <>
            {/* Top Summary Section */}
            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{licenseState.planLabel}</span>
                    <span>·</span>
                    <span>
                      {licenseEvaluation.status === 'active'
                        ? 'Active Subscription'
                        : licenseEvaluation.status === 'expiring_soon'
                        ? 'Renewal Due Soon'
                        : 'Renewal Required'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {settings.storeName}
                  </h3>
                  {licenseState.activeKey && (
                    <p className="text-xs font-mono tabular-nums text-neutral-500">
                      Active Key: {licenseState.activeKey}
                    </p>
                  )}
                </div>

                {/* System Installation ID */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                  <div>
                    <div className="text-[11px] text-neutral-500">System Installation ID</div>
                    <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                      {licenseState.installationId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInstallId}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedInstallId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3-Column Metrics + Validity Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Days Remaining</span>
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      licenseEvaluation.daysRemaining <= 30
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {licenseEvaluation.daysRemaining} Days
                  </div>
                  <div className="text-xs text-neutral-500">
                    Out of {licenseEvaluation.totalDays} days cycle
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Activated On</span>
                  </div>
                  <div className="text-lg font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {licenseState.activatedAt ? formatDate(licenseState.activatedAt) : '—'}
                  </div>
                  <div className="text-xs text-neutral-500">Last renewal timestamp</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Valid Until (Annual Expiry)</span>
                  </div>
                  <div className="text-lg font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                    {licenseState.expiresAt ? formatDate(licenseState.expiresAt) : '—'}
                  </div>
                  <div className="text-xs text-neutral-500">Requires new key after this date</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Annual License Validity Progress</span>
                  <span className="font-mono tabular-nums">{licenseEvaluation.progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      licenseEvaluation.daysRemaining <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${licenseEvaluation.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Annual License Renewal Box */}
            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Renew Annual License (नया 1-वर्षीय लाइसेंस की दर्ज करें)
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  नया लाइसेंस की दर्ज करने पर आपकी वर्तमान वैधता में पूरे 1 वर्ष (365 दिन) जुड़ जाएंगे। पुरानी उपयोग की गई की दोबारा स्वीकार नहीं की जाएगी।
                </p>
              </div>

              <form
                onSubmit={handleRenewalSubmit}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <input
                  type="text"
                  value={renewalKey}
                  onChange={e => {
                    setRenewalKey(formatLicenseKeyInput(e.target.value));
                    if (renewalFeedback) setRenewalFeedback(null);
                  }}
                  placeholder="VYPR-XXXX-XXXX-XXXX-XXXX-XXXX"
                  spellCheck={false}
                  className="flex-1 px-4 py-2.5 text-sm font-mono tabular-nums uppercase tracking-wider bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Activate / Renew Key</span>
                </button>
              </form>

              {renewalFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    renewalFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {renewalFeedback.text}
                </div>
              )}
            </div>

            {/* Activation & Renewal History Ledger */}
            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    License Renewal History ({licenseState.history.length})
                  </h3>
                  <p className="text-xs text-neutral-500">
                    इस सिस्टम पर उपयोग की गई सभी लाइसेंस की का रिकॉर्ड (Used keys cannot be reused)
                  </p>
                </div>
              </div>

              {licenseState.history.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4">
                  No license activations recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                        <th className="py-2.5 pr-4 font-medium">License Key</th>
                        <th className="py-2.5 px-4 font-medium">Plan</th>
                        <th className="py-2.5 px-4 font-medium">Activated On</th>
                        <th className="py-2.5 px-4 font-medium">Valid Until</th>
                        <th className="py-2.5 pl-4 font-medium text-right">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {licenseState.history.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-4 font-mono tabular-nums font-medium text-neutral-900 dark:text-neutral-100">
                            {item.licenseKey}
                          </td>
                          <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                            {item.planLabel} ({item.durationDays}d)
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                            {formatDateTime(item.activatedAt)}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                            {formatDate(item.expiresAt)}
                          </td>
                          <td className="py-3 pl-4 text-right text-neutral-600 dark:text-neutral-400">
                            {idx === 0 && !licenseEvaluation.isLockedByLicense
                              ? 'Current Active'
                              : 'Used / Burned'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : !isCreatorUnlocked ? (
          /* Exclusive Creator Login ID + Password Gate (Zero credential hints) */
          <div className="max-w-md mx-auto p-6 sm:p-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5 my-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Restricted Creator Console
                </h3>
                <p className="text-xs text-neutral-500">
                  केवल सॉफ्टवेयर निर्माता (Creator) के लिए सुरक्षित ID और पासवर्ड लॉगिन
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatorUnlock} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label
                  htmlFor="manager-creator-id"
                  className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Creator Login ID
                </label>
                <input
                  id="manager-creator-id"
                  type="text"
                  value={creatorIdInput}
                  onChange={e => {
                    setCreatorIdInput(e.target.value);
                    if (creatorAuthError) setCreatorAuthError('');
                  }}
                  placeholder="Enter Exclusive Creator ID"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="manager-creator-password"
                  className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Creator Password
                </label>
                <div className="relative">
                  <input
                    id="manager-creator-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={creatorPasswordInput}
                    onChange={e => {
                      setCreatorPasswordInput(e.target.value);
                      if (creatorAuthError) setCreatorAuthError('');
                    }}
                    placeholder="Enter Creator Password"
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(prev => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {creatorAuthError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  {creatorAuthError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-colors cursor-pointer"
              >
                Sign In to Creator Console
              </button>
            </form>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 leading-relaxed">
              यह पैनल दुकान के कैशियर या स्टोर एडमिन के लिए नहीं है। 5 बार गलत प्रयास करने पर सुरक्षा लॉक स्वतः सक्रिय हो जाता है।
            </div>
          </div>
        ) : (
          /* Unlocked Creator Key Generator Studio */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">
                Creator Console Authenticated · Generate signed annual keys for any store
              </div>
              <button
                type="button"
                onClick={handleCreatorLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Creator Console</span>
              </button>
            </div>

            {/* Key Generator Form */}
            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Generate New Annual License Key (नई लाइसेंस की बनाएं)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  हर बार रिन्यूअल पर ग्राहक के लिए यहाँ से एक नई यूनिक 1-साल की लाइसेंस की जनरेट करें।
                </p>
              </div>

              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Customer / Store Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="e.g. Sharma Supermarket"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Customer WhatsApp / Mobile (Optional)
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      License Validity Duration
                    </label>
                    <select
                      value={durationPreset}
                      onChange={e => setDurationPreset(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="365">1 Year Annual License (365 Days) — Default</option>
                      <option value="730">2 Years License (730 Days)</option>
                      <option value="1095">3 Years License (1095 Days)</option>
                      <option value="180">6 Months License (180 Days)</option>
                      <option value="30">30 Days Monthly / Trial</option>
                      <option value="custom">Custom Days...</option>
                    </select>
                  </div>

                  {durationPreset === 'custom' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Custom Validity (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={customDays}
                        onChange={e => setCustomDays(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Key Device Binding
                    </label>
                    <select
                      value={lockMode}
                      onChange={e => setLockMode(e.target.value as 'universal' | 'device')}
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="device">Lock to Specific System Installation ID</option>
                      <option value="universal">Universal Single-Use Key (Any System ID)</option>
                    </select>
                  </div>

                  {lockMode === 'device' && (
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Client System Installation ID
                        </label>
                        <button
                          type="button"
                          onClick={() => setTargetInstallId(licenseState.installationId)}
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Use This Terminal ID ({licenseState.installationId})
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={targetInstallId}
                        onChange={e => setTargetInstallId(e.target.value.toUpperCase())}
                        placeholder="POS-XXXX-XXXX"
                        className="w-full px-3 py-2 text-xs font-mono uppercase bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Remarks / Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={keyNotes}
                      onChange={e => setKeyNotes(e.target.value)}
                      placeholder="e.g. Paid ₹2,999 via UPI for 2026-2027 Renewal"
                      className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Generate New License Key</span>
                </button>
              </form>

              {newlyCreatedKey && (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-neutral-500">Generated Renewal / Activation Key</div>
                    <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 tracking-wider">
                      {newlyCreatedKey}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyKey(newlyCreatedKey, 'latest')}
                      className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKeyId === 'latest' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const res = activateLicenseKey(newlyCreatedKey);
                        setRenewalFeedback({
                          type: res.ok ? 'success' : 'error',
                          text: res.message,
                        });
                        if (res.ok) setSubTab('status');
                      }}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 cursor-pointer"
                    >
                      Apply to This Store
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Issued Keys Registry Table */}
            <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Generated Keys Ledger ({generatedKeys.length})
                  </h3>
                  <p className="text-xs text-neutral-500">
                    आपके द्वारा ग्राहकों के लिए बनाई गई सभी लाइसेंस की की सूची
                  </p>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search client or key..."
                  className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg sm:w-64"
                />
              </div>

              {filteredKeys.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4">
                  No generated license keys found yet. Use the form above to create a 1-year key.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                        <th className="py-2.5 pr-4 font-medium">Client / Shop</th>
                        <th className="py-2.5 px-4 font-medium">License Key</th>
                        <th className="py-2.5 px-4 font-medium">Validity</th>
                        <th className="py-2.5 px-4 font-medium">Target ID</th>
                        <th className="py-2.5 px-4 font-medium">Created</th>
                        <th className="py-2.5 pl-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {filteredKeys.map(rec => {
                        const waText = encodeURIComponent(
                          [
                            `नमस्ते *${rec.clientName}*,`,
                            `आपका VyaparPOS सॉफ्टवेयर लाइसेंस की (${rec.planLabel}) तैयार है:`,
                            `*${rec.licenseKey}*`,
                            ...(rec.targetInstallationId
                              ? [`System ID: ${rec.targetInstallationId}`]
                              : []),
                            `वैधता: ${rec.durationDays} Days`,
                          ].join('\n')
                        );
                        const cleanPhone = (rec.clientPhone || '').replace(/\D/g, '');
                        const waLink = cleanPhone
                          ? `https://wa.me/${cleanPhone}?text=${waText}`
                          : `https://wa.me/?text=${waText}`;

                        return (
                          <tr key={rec.id}>
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {rec.clientName}
                              </div>
                              {rec.notes && (
                                <div className="text-[11px] text-neutral-500 truncate max-w-[180px]">
                                  {rec.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                              {rec.licenseKey}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                              {rec.durationDays} Days
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                              {rec.targetInstallationId || 'Any Terminal'}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-neutral-500">
                              {formatDate(rec.createdAt)}
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(rec.licenseKey, rec.id)}
                                  title="Copy License Key"
                                  className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedKeyId === rec.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Send Key via WhatsApp"
                                  className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-emerald-600 inline-flex items-center"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => deleteGeneratedKey(rec.id)}
                                  title="Delete Record"
                                  className="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 inline-flex items-center cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Creator Security Credentials, Vendor Contact & Renewal Lock Testing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Update Exclusive Creator ID & Password */}
              <form
                onSubmit={handleUpdateCredentials}
                autoComplete="off"
                className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Change Creator Login ID & Password
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      अपनी सीक्रेट क्रिएटर ID या पासवर्ड बदलने के लिए वर्तमान पासवर्ड दर्ज करें
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSecurityPasswords(prev => !prev)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    title={showSecurityPasswords ? 'Hide fields' : 'Show fields'}
                  >
                    {showSecurityPasswords ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Current Creator Password *
                    </label>
                    <input
                      type={showSecurityPasswords ? 'text' : 'password'}
                      required
                      value={currentCreatorPass}
                      onChange={e => {
                        setCurrentCreatorPass(e.target.value);
                        if (credentialFeedback) setCredentialFeedback(null);
                      }}
                      placeholder="Enter current password to verify"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      New Creator Login ID (Leave blank to keep existing ID)
                    </label>
                    <input
                      type="text"
                      value={newCreatorId}
                      onChange={e => {
                        setNewCreatorId(e.target.value.toUpperCase());
                        if (credentialFeedback) setCredentialFeedback(null);
                      }}
                      placeholder="e.g. VYPR-CREATOR-NEW"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 py-2 text-xs font-mono uppercase bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        New Password (min 6 chars)
                      </label>
                      <input
                        type={showSecurityPasswords ? 'text' : 'password'}
                        value={newCreatorPass}
                        onChange={e => {
                          setNewCreatorPass(e.target.value);
                          if (credentialFeedback) setCredentialFeedback(null);
                        }}
                        placeholder="New password"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Confirm New Password
                      </label>
                      <input
                        type={showSecurityPasswords ? 'text' : 'password'}
                        value={confirmNewCreatorPass}
                        onChange={e => {
                          setConfirmNewCreatorPass(e.target.value);
                          if (credentialFeedback) setCredentialFeedback(null);
                        }}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {credentialFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs border ${
                      credentialFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {credentialFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 cursor-pointer"
                >
                  Update Creator ID / Password
                </button>
              </form>

              <div className="space-y-6">
                {/* Vendor Support Contact Settings */}
                <form
                  onSubmit={handleSaveVendorContact}
                  className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Creator Renewal Contact Info
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      लाइसेंस समाप्त होने पर ग्राहक को दिखने वाला WhatsApp सपोर्ट नंबर
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Provider / Creator Name
                      </label>
                      <input
                        type="text"
                        value={vendorNameInput}
                        onChange={e => setVendorNameInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        WhatsApp (e.g. 9198XXXXXXXX)
                      </label>
                      <input
                        type="tel"
                        value={vendorPhoneInput}
                        onChange={e => setVendorPhoneInput(e.target.value)}
                        placeholder="919876543210"
                        className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                      />
                    </div>
                  </div>

                  {vendorSavedMsg && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {vendorSavedMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    Save Contact Info
                  </button>
                </form>

                {/* Renewal Simulation Box for Creator Verification */}
                <div className="p-6 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        Test Annual Expiry & Renewal Gate
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      1 साल पूरा होने पर लॉक स्क्रीन और नई लाइसेंस की की जांच करने के लिए:
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={simulateLicenseExpiringSoon}
                      className="w-full px-4 py-2.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer text-left flex items-center justify-between"
                    >
                      <span>Simulate 7 Days Remaining (Warning Banner Test)</span>
                      <ArrowRightIcon />
                    </button>

                    <button
                      type="button"
                      onClick={simulateLicenseExpiry}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer text-left flex items-center justify-between"
                    >
                      <span>Simulate 1-Year Expiry Now (Force Renewal Lock)</span>
                      <ArrowRightIcon />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ArrowRightIcon: React.FC = () => (
  <span aria-hidden="true" className="font-mono text-xs">
    →
  </span>
);
