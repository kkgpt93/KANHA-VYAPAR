import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldAlert,
  Copy,
  Check,
  Download,
  Lock,
  ArrowRight,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatLicenseKeyInput,
  PUBLIC_LOGIN_ID,
  PUBLIC_LOGIN_PASSWORD,
  PUBLIC_2DAY_LICENSE_KEY,
} from '../utils/license';
import { formatDateTime } from '../utils/formatters';
import { COLOR_THEMES } from '../utils/themes';

type GateTab = 'public' | 'annual' | 'creator';

export const LicenseGateModal: React.FC = () => {
  const {
    licenseState,
    licenseEvaluation,
    activateLicenseKey,
    loginWithPublicLicense,
    loginAsCreatorLifetime,
    settings,
    exportBackup,
    creatorConfig,
    verifyCreatorCredentials,
    generateNewLicenseKey,
    colorTheme,
    setColorTheme,
  } = useApp();

  const isPublicExpired =
    licenseState.publicTrialUsed &&
    Boolean(licenseState.publicTrialExpiresAt) &&
    Date.now() >= new Date(licenseState.publicTrialExpiresAt!).getTime();

  const [gateTab, setGateTab] = useState<GateTab>(() => (isPublicExpired ? 'annual' : 'public'));

  // Public 2-Day Login State
  const [publicIdInput, setPublicIdInput] = useState(PUBLIC_LOGIN_ID);
  const [publicPassInput, setPublicPassInput] = useState(PUBLIC_LOGIN_PASSWORD);
  const [publicKeyInput, setPublicKeyInput] = useState(PUBLIC_2DAY_LICENSE_KEY);
  const [showPublicPass, setShowPublicPass] = useState(false);
  const [publicFeedback, setPublicFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Annual 1-Year Key State
  const [keyInput, setKeyInput] = useState('');
  const [annualFeedback, setAnnualFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Creator Login (Always Valid + Key Generator) State — ZERO UI HINTS
  const [creatorIdInput, setCreatorIdInput] = useState('');
  const [creatorPasswordInput, setCreatorPasswordInput] = useState('');
  const [showCreatorPassword, setShowCreatorPassword] = useState(false);
  const [creatorError, setCreatorError] = useState('');
  const [creatorKeygenOnlyUnlocked, setCreatorKeygenOnlyUnlocked] = useState(false);

  // Quick generator state (when Creator chooses Key Generator Only on customer PC)
  const [genClientName, setGenClientName] = useState(settings.storeName || 'Retail Store');
  const [genDays, setGenDays] = useState<number>(365);
  const [bindToThisDevice, setBindToThisDevice] = useState<boolean>(true);
  const [latestGeneratedKey, setLatestGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (isPublicExpired && gateTab === 'public') {
      setGateTab('annual');
    }
  }, [isPublicExpired]);

  if (!licenseEvaluation.isLockedByLicense) {
    return null;
  }

  const isExpired = licenseEvaluation.status === 'expired';
  const isClockTampered = licenseEvaluation.status === 'clock_tampered';

  const handleCopyInstallationId = async () => {
    try {
      await navigator.clipboard.writeText(licenseState.installationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePublicLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWithPublicLicense(publicIdInput, publicPassInput, publicKeyInput);
    if (res.ok) {
      setPublicFeedback({ type: 'success', text: res.message });
    } else {
      setPublicFeedback({ type: 'error', text: res.message });
    }
  };

  const handleFillPublicCredentials = () => {
    setPublicIdInput(PUBLIC_LOGIN_ID);
    setPublicPassInput(PUBLIC_LOGIN_PASSWORD);
    setPublicKeyInput(PUBLIC_2DAY_LICENSE_KEY);
    setPublicFeedback(null);
  };

  const handleAnnualActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setAnnualFeedback({
        type: 'error',
        text: 'कृपया अपनी 1-वर्षीय लाइसेंस की (License Key) दर्ज करें।',
      });
      return;
    }

    const res = activateLicenseKey(keyInput);
    if (res.ok) {
      setAnnualFeedback({ type: 'success', text: res.message });
      setKeyInput('');
    } else {
      setAnnualFeedback({ type: 'error', text: res.message });
    }
  };

  const resetCreatorSession = () => {
    setCreatorKeygenOnlyUnlocked(false);
    setCreatorIdInput('');
    setCreatorPasswordInput('');
    setShowCreatorPassword(false);
    setCreatorError('');
  };

  const handleCreatorAlwaysValidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginAsCreatorLifetime(creatorIdInput, creatorPasswordInput);
    if (res.ok) {
      resetCreatorSession();
    } else {
      setCreatorError(res.message);
    }
  };

  const handleOpenCreatorKeygenOnly = () => {
    const res = verifyCreatorCredentials(creatorIdInput, creatorPasswordInput);
    if (res.ok) {
      setCreatorKeygenOnlyUnlocked(true);
      setCreatorIdInput('');
      setCreatorPasswordInput('');
      setShowCreatorPassword(false);
      setCreatorError('');
    } else {
      setCreatorError(res.error || 'अमान्य क्रिएटर ID या पासवर्ड!');
    }
  };

  const handleQuickGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = generateNewLicenseKey({
      clientName: genClientName || settings.storeName,
      durationDays: genDays,
      targetInstallationId: bindToThisDevice ? licenseState.installationId : '',
      notes: isExpired ? 'Annual Renewal Key' : 'Initial Activation Key',
    });
    setLatestGeneratedKey(rec.licenseKey);
  };

  const handleCopyGeneratedKey = async () => {
    if (!latestGeneratedKey) return;
    try {
      await navigator.clipboard.writeText(latestGeneratedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleEmergencyBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VyaparPOS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const whatsappRenewalMessage = encodeURIComponent(
    [
      `नमस्ते ${creatorConfig.vendorName || 'Admin'},`,
      `हमें VyaparPOS सॉफ्टवेयर (${settings.storeName}) के लिए 1-वर्षीय लाइसेंस की चाहिए।`,
      `System Installation ID: *${licenseState.installationId}*`,
      ...(licenseState.activeKey ? [`Previous Key: ${licenseState.activeKey}`] : []),
      `कृपया अगले 1 वर्ष (365 Days) के लिए नई लाइसेंस की जारी करें।`,
    ].join('\n')
  );

  const cleanVendorPhone = creatorConfig.vendorPhone.replace(/\D/g, '');
  const whatsappHref = cleanVendorPhone
    ? `https://wa.me/${cleanVendorPhone}?text=${whatsappRenewalMessage}`
    : `https://wa.me/?text=${whatsappRenewalMessage}`;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Signature Jewel Showcase & System Identity Column */}
          <div className="lg:col-span-5 p-6 sm:p-8 brand-command-surface text-white border-b lg:border-b-0 lg:border-r flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    isExpired || isClockTampered
                      ? 'bg-rose-500/20 border-rose-400/30 text-rose-200'
                      : 'bg-white/12 border-white/20 brand-gold-text'
                  }`}
                >
                  {isExpired || isClockTampered ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <KeyRound className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs text-white/75">
                    Vyapar<span className="brand-gold-text font-semibold">POS</span> Access Portal
                  </div>
                  <h1 className="text-lg font-bold text-white">
                    {isClockTampered
                      ? 'System Clock Error'
                      : isExpired
                      ? licenseEvaluation.isPublicTrial
                        ? '2-Day Public License Expired'
                        : 'Annual License Expired'
                      : 'Login & License Activation'}
                  </h1>
                </div>
              </div>

              <p className="text-sm text-white/85 leading-relaxed">
                {isClockTampered
                  ? 'सिस्टम की घड़ी/तारीख पीछे की गई है। कृपया सही समय सेट करें या नया 1-वर्षीय लाइसेंस की दर्ज करें।'
                  : isExpired && licenseEvaluation.isPublicTrial
                  ? 'आपकी 2 दिन (48 घंटे) की पब्लिक ट्रायल लाइसेंस अवधि समाप्त हो चुकी है। आगे बिलिंग जारी रखने के लिए 1-वर्षीय लाइसेंस की दर्ज करें या Creator Login से साइन इन करें।'
                  : isExpired
                  ? 'आपके सॉफ्टवेयर की 1 वर्ष की लाइसेंस अवधि समाप्त हो चुकी है। आगे उपयोग के लिए नई 1-वर्षीय लाइसेंस की दर्ज करें।'
                  : 'पब्लिक यूज़र 2 दिन के पब्लिक लाइसेंस के साथ लॉगिन कर सकते हैं, स्टोर ओनर 1-साल की लाइसेंस की डालें, और Creator हमेशा के लिए (Always Valid) लॉगिन कर सकते हैं।'}
              </p>

              {/* System Installation ID Box */}
              <div className="p-4 rounded-xl bg-white/10 border border-white/18 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/75">
                  <span>System Installation ID</span>
                  <span>Share for 1-Year Key</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-base font-bold font-mono tabular-nums brand-gold-text tracking-wider">
                    {licenseState.installationId}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyInstallationId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-300" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-white/75 pt-1 border-t border-white/15 flex items-center justify-between">
                  <span>Public: 2 Days</span>
                  <span>·</span>
                  <span>Store: 365 Days</span>
                  <span>·</span>
                  <span>Creator: Unlimited</span>
                </div>
              </div>

              {isExpired && licenseState.expiresAt && (
                <div className="space-y-1 text-xs text-white/80">
                  <div className="flex items-center justify-between">
                    <span>Expired On:</span>
                    <span className="font-mono tabular-nums font-semibold text-rose-300">
                      {formatDateTime(licenseState.expiresAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Safe Actions */}
            <div className="space-y-2.5 pt-4 border-t border-white/15">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg brand-active-tab hover:opacity-95 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>WhatsApp पर 1-साल की लाइसेंस की मांगें</span>
              </a>

              <button
                type="button"
                onClick={handleEmergencyBackup}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-white/20 bg-white/8 text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Safe Data Backup (.json)</span>
              </button>
            </div>
          </div>

          {/* Right Panel: 3-Mode Login & Activation Switcher */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
            {/* Compact Color Swatch Selector + Segmented Mode Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>Select Access Mode</span>
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline">Theme:</span>
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setColorTheme(theme.id)}
                      title={`${theme.name} (${theme.nameHindi})`}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        colorTheme === theme.id
                          ? 'ring-2 ring-offset-1 ring-neutral-900 dark:ring-white scale-110'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: theme.accentHex }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    resetCreatorSession();
                    setGateTab('public');
                  }}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    gateTab === 'public'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  Public (2 Days)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetCreatorSession();
                    setGateTab('annual');
                  }}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    gateTab === 'annual'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  1-Year Key
                </button>

                <button
                  type="button"
                  onClick={() => setGateTab('creator')}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    gateTab === 'creator'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  Creator Login
                </button>
              </div>
            </div>

            {/* TAB 1: PUBLIC LOGIN + 2-DAY PUBLIC LICENSE */}
            {gateTab === 'public' && (
              <div className="space-y-4 my-auto">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Public Login (2-Day Valid Public License)</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    पब्लिक डेमो और ट्रायल के लिए यह लॉगिन व पब्लिक लाइसेंस की पूरे <strong>2 दिन (48 घंटे)</strong> के लिए मान्य है।
                  </p>
                </div>

                {isPublicExpired ? (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-3">
                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">
                      इस सिस्टम पर 2-दिन (48 घंटे) का पब्लिक लाइसेंस पहले ही उपयोग होकर समाप्त हो चुका है!
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      आगे सॉफ्टवेयर चलाने के लिए कृपया 1-साल की नई लाइसेंस की दर्ज करें।
                    </p>
                    <button
                      type="button"
                      onClick={() => setGateTab('annual')}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 cursor-pointer"
                    >
                      Enter 1-Year License Key →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Public Credentials Info Box */}
                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="space-y-0.5 font-mono">
                        <div>
                          <span className="text-neutral-500">ID:</span>{' '}
                          <strong className="text-neutral-900 dark:text-neutral-100">
                            {PUBLIC_LOGIN_ID}
                          </strong>{' '}
                          <span className="text-neutral-400">·</span>{' '}
                          <span className="text-neutral-500">Pass:</span>{' '}
                          <strong className="text-neutral-900 dark:text-neutral-100">
                            {PUBLIC_LOGIN_PASSWORD}
                          </strong>
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Key: {PUBLIC_2DAY_LICENSE_KEY}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleFillPublicCredentials}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0 cursor-pointer"
                      >
                        Auto-Fill
                      </button>
                    </div>

                    <form onSubmit={handlePublicLoginSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Public Login ID
                          </label>
                          <input
                            type="text"
                            required
                            value={publicIdInput}
                            onChange={e => {
                              setPublicIdInput(e.target.value.toUpperCase());
                              if (publicFeedback) setPublicFeedback(null);
                            }}
                            className="w-full px-3 py-2 text-xs font-mono uppercase bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Public Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPublicPass ? 'text' : 'password'}
                              required
                              value={publicPassInput}
                              onChange={e => {
                                setPublicPassInput(e.target.value);
                                if (publicFeedback) setPublicFeedback(null);
                              }}
                              className="w-full pl-3 pr-9 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPublicPass(p => !p)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                            >
                              {showPublicPass ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          2-Day Public License Key
                        </label>
                        <input
                          type="text"
                          required
                          value={publicKeyInput}
                          onChange={e => {
                            setPublicKeyInput(formatLicenseKeyInput(e.target.value));
                            if (publicFeedback) setPublicFeedback(null);
                          }}
                          className="w-full px-3 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-wider bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      {publicFeedback && (
                        <div
                          className={`p-3 rounded-lg text-xs border ${
                            publicFeedback.type === 'error'
                              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {publicFeedback.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                      >
                        <span>Start 2-Day Public Access</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: 1-YEAR ANNUAL LICENSE KEY */}
            {gateTab === 'annual' && (
              <div className="space-y-5 my-auto">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {isExpired
                      ? 'नई 1-वर्षीय लाइसेंस की दर्ज करें (Renew 1 Year)'
                      : '1-वर्षीय लाइसेंस की दर्ज करें (Activate 1 Year)'}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Creator द्वारा जनरेट की गई 20-अक्षरों की यूनिक वार्षिक लाइसेंस की नीचे दर्ज करें।
                  </p>
                </div>

                <form onSubmit={handleAnnualActivateSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="license-key-input"
                      className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      Annual Product License Key (365 Days)
                    </label>
                    <input
                      id="license-key-input"
                      type="text"
                      value={keyInput}
                      onChange={e => {
                        setKeyInput(formatLicenseKeyInput(e.target.value));
                        if (annualFeedback) setAnnualFeedback(null);
                      }}
                      placeholder="VYPR-XXXX-XXXX-XXXX-XXXX-XXXX"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-4 py-3.5 text-sm sm:text-base font-mono tabular-nums tracking-wider uppercase bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  {annualFeedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs leading-relaxed border ${
                        annualFeedback.type === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {annualFeedback.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-colors cursor-pointer"
                  >
                    <span>Activate 1-Year Annual License</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: EXCLUSIVE CREATOR LOGIN (ALWAYS VALID / LIFETIME + KEYGEN) */}
            {gateTab === 'creator' && (
              <div className="space-y-4 my-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Creator Login (Always Valid)</span>
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      केवल सॉफ्टवेयर Creator के लिए — लॉगिन करने पर सॉफ्टवेयर हमेशा (Unlimited Time) मान्य रहेगा
                    </p>
                  </div>
                  {creatorKeygenOnlyUnlocked && (
                    <button
                      type="button"
                      onClick={resetCreatorSession}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  )}
                </div>

                {!creatorKeygenOnlyUnlocked ? (
                  <form
                    onSubmit={handleCreatorAlwaysValidSubmit}
                    className="space-y-3.5"
                    autoComplete="off"
                  >
                    <div className="space-y-1">
                      <label
                        htmlFor="gate-creator-id"
                        className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      >
                        Creator Login ID
                      </label>
                      <input
                        id="gate-creator-id"
                        type="text"
                        value={creatorIdInput}
                        onChange={e => {
                          setCreatorIdInput(e.target.value);
                          if (creatorError) setCreatorError('');
                        }}
                        placeholder="Enter Exclusive Creator ID"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="gate-creator-pass"
                        className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      >
                        Creator Password
                      </label>
                      <div className="relative">
                        <input
                          id="gate-creator-pass"
                          type={showCreatorPassword ? 'text' : 'password'}
                          value={creatorPasswordInput}
                          onChange={e => {
                            setCreatorPasswordInput(e.target.value);
                            if (creatorError) setCreatorError('');
                          }}
                          placeholder="Enter Creator Password"
                          autoComplete="new-password"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatorPassword(prev => !prev)}
                          aria-label={showCreatorPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          {showCreatorPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {creatorError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                        {creatorError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-colors cursor-pointer"
                      >
                        Sign In as Creator (Always Valid)
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenCreatorKeygenOnly}
                        className="py-2.5 px-3.5 text-xs font-medium rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        Key Generator Only
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <form onSubmit={handleQuickGenerate} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Client / Shop Name
                          </label>
                          <input
                            type="text"
                            value={genClientName}
                            onChange={e => setGenClientName(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Validity Period
                          </label>
                          <select
                            value={genDays}
                            onChange={e => setGenDays(Number(e.target.value))}
                            className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                          >
                            <option value={365}>1 Year Annual (365 Days)</option>
                            <option value={730}>2 Years (730 Days)</option>
                            <option value={180}>6 Months (180 Days)</option>
                            <option value={30}>30 Days Monthly</option>
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={bindToThisDevice}
                          onChange={e => setBindToThisDevice(e.target.checked)}
                          className="rounded border-neutral-300 text-emerald-600"
                        />
                        <span>Lock key to this System ID ({licenseState.installationId})</span>
                      </label>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                      >
                        Create New License Key
                      </button>
                    </form>

                    {latestGeneratedKey && (
                      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-emerald-300 dark:border-emerald-800 space-y-3">
                        <div className="text-xs text-neutral-500">
                          Generated Key ({genDays} Days):
                        </div>
                        <div className="font-mono tabular-nums text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 break-all">
                          {latestGeneratedKey}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleCopyGeneratedKey}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedKey ? (
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
                              setKeyInput(latestGeneratedKey);
                              resetCreatorSession();
                              setGateTab('annual');
                              setAnnualFeedback(null);
                            }}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 cursor-pointer"
                          >
                            Use Key in 1-Year Tab
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer bar */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Offline Signed Security</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Creator Access = Always Valid</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
