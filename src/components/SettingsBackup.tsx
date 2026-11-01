import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  Trash2,
  Bell,
  Volume2,
  VolumeX,
  Share2,
  Wifi,
  WifiOff,
  CheckCircle2,
  Building2,
  KeyRound,
  Link2,
  Palette,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoreSettings } from '../types';
import { formatDate } from '../utils/formatters';
import { COLOR_THEMES } from '../utils/themes';
import { GstSlabManagerPanel } from './GstSlabManagerModal';

export const SettingsBackup: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportBackup,
    importBackup,
    clearAllData,
    isOffline,
    requestPushPermission,
    addNotification,
    licenseState,
    licenseEvaluation,
    setActiveTab,
    pendingEntryAction,
    clearPendingEntryAction,
    colorTheme,
    setColorTheme,
    isDarkMode,
    toggleDarkMode,
  } = useApp();

  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmClean, setConfirmClean] = useState(false);
  const storeNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  useEffect(() => {
    if (pendingEntryAction === 'store-profile') {
      storeNameInputRef.current?.focus();
      storeNameInputRef.current?.select();
      clearPendingEntryAction();
    }
  }, [pendingEntryAction, clearPendingEntryAction]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
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

    addNotification({
      title: 'Backup Downloaded',
      message: 'System backup JSON file successfully exported.',
      type: 'system',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = importBackup(content);
      if (success) {
        setImportStatus('Backup restored successfully! All data updated.');
        addNotification({
          title: 'Backup Restored',
          message: 'Database restored from imported backup file.',
          type: 'system',
        });
      } else {
        setImportStatus('Failed to restore backup. Invalid JSON file format.');
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    if (granted) {
      setFormData(prev => ({ ...prev, enablePushNotifications: true }));
      updateSettings({ ...settings, enablePushNotifications: true });
      addNotification({
        title: 'Push Notifications Enabled',
        message: 'You will now receive desktop/mobile push alerts for low stock and sales.',
        type: 'system',
      });
    } else {
      setImportStatus('Notification permission was not granted by your browser.');
      setTimeout(() => setImportStatus(null), 3500);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Store Profile, Backup & Offline Sync
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage tax configurations, annual license, UPI payment address, and system exports
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <div className="p-4 lg:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Signature Color Theme & Appearance Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl brand-command-surface text-white flex items-center justify-center border">
                <Palette className="w-5 h-5 brand-gold-text" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Signature App Color Theme (विशेष कलर थीम चुनें)
                </h3>
                <p className="text-xs text-neutral-500">
                  अपने POS सॉफ्टवेयर के लिए आकर्षक सिग्नेचर कलर पैलेट और Light/Dark मोड चुनें
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Switch to Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-emerald-600" />
                  <span>Switch to Dark Mode</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {COLOR_THEMES.map(theme => {
              const isSelected = colorTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setColorTheme(theme.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/50 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      <span
                        className="w-5 h-5 rounded-full border-2 border-white dark:border-neutral-900"
                        style={{ backgroundColor: theme.commandHex }}
                      />
                      <span
                        className="w-5 h-5 rounded-full border-2 border-white dark:border-neutral-900"
                        style={{ backgroundColor: theme.accentHex }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900"
                        style={{ backgroundColor: theme.highlightHex }}
                      />
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                      {theme.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{theme.nameHindi}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Annual Software License & Keygen Quick Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                {licenseEvaluation.isCreatorLifetime
                  ? 'Creator Lifetime License (Always Valid — Unlimited)'
                  : licenseEvaluation.isPublicTrial
                  ? `2-Day Public License (${licenseEvaluation.hoursRemaining} Hours Remaining)`
                  : `Annual Software License (${licenseEvaluation.daysRemaining} Days Remaining)`}
              </h3>
              <p className="text-xs text-neutral-500 font-mono tabular-nums">
                System ID: {licenseState.installationId}
                {licenseEvaluation.isCreatorLifetime
                  ? ' · Valid Until: Never Expires'
                  : licenseState.expiresAt
                  ? ` · Valid Until: ${formatDate(licenseState.expiresAt)}`
                  : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('license')}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer"
          >
            Manage License & Keygen
          </button>
        </div>

        {/* Offline & System Sync Status Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOffline
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
              }`}
            >
              {isOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                {isOffline ? 'Offline Mode Active' : 'Online & Synchronized'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isOffline
                  ? 'Bills and stock changes are saved in local storage. Automatic sync on reconnection.'
                  : 'Local database is 100% functional offline with zero cloud dependency.'}
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Slab & Custom GST Configuration Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <GstSlabManagerPanel />
        </div>

        {/* Store Settings Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section 1: Business Details */}
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Business & Invoice Identity
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Store / Business Name *
                </label>
                <input
                  ref={storeNameInputRef}
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Enter your shop / business name"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Tagline / Motto
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Store Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono focus:outline-hidden"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Physical Store Address (Printed on bill)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  UPI VPA (QR Code Payment on Bill)
                </label>
                <input
                  type="text"
                  value={formData.upiVpa}
                  onChange={e => setFormData({ ...formData, upiVpa: e.target.value })}
                  placeholder="yourshop@okhdfcbank"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono text-emerald-700 dark:text-emerald-400 font-semibold focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Social Media Integration */}
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <Share2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Social Media Integration & Customer Reach
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  WhatsApp Business Number
                </label>
                <input
                  type="text"
                  value={formData.social.whatsapp}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      social: { ...formData.social, whatsapp: e.target.value },
                    })
                  }
                  placeholder="919876543210"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg font-mono focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Instagram Username
                </label>
                <input
                  type="text"
                  value={formData.social.instagram}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      social: { ...formData.social, instagram: e.target.value },
                    })
                  }
                  placeholder="vyaparmart_official"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Facebook Page
                </label>
                <input
                  type="text"
                  value={formData.social.facebook}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      social: { ...formData.social, facebook: e.target.value },
                    })
                  }
                  placeholder="vyaparmart.india"
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Google Maps Review Link
                </label>
                <input
                  type="text"
                  value={formData.social.googleMaps}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      social: { ...formData.social, googleMaps: e.target.value },
                    })
                  }
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Audio & Push Notification Preferences */}
          <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <Bell className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Push Notifications & Audio Alerts
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
              <div>
                <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  Audio Feedback (Synthesizer)
                </div>
                <div className="text-[11px] text-neutral-500">
                  Play scan beeps and checkout chime on transactions
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, soundEnabled: !formData.soundEnabled })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                  formData.soundEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {formData.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{formData.soundEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  Real-time Web Push Notifications
                </div>
                <div className="text-[11px] text-neutral-500">
                  Alert you immediately on critical low stock and new sales
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                Enable Push Alerts
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>

        {/* Section 4: Data Backup & Restore */}
        <div className="p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <Download className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Data Backup & Disaster Recovery
            </h3>
          </div>

          <p className="text-xs text-neutral-500">
            Export a full JSON backup of all catalog items, sales invoices, user accounts, and settings for safe keeping or migration.
          </p>

          {importStatus && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              {importStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Download Backup */}
            <button
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>

            {/* Upload / Restore */}
            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Restore From Backup (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Open New Data Links Hub */}
            <button
              type="button"
              onClick={() => setActiveTab('setup')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>New Data Entry Links</span>
            </button>

            {/* Clean All Store Data (Inline 2-Step Confirmation, zero alert/confirm) */}
            {!confirmClean ? (
              <button
                type="button"
                onClick={() => setConfirmClean(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors ml-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean All Store Data</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    clearAllData();
                    setConfirmClean(false);
                    setImportStatus('सभी स्टोर डेटा सफलतापूर्वक साफ (Clean) कर दिया गया है!');
                    setTimeout(() => setImportStatus(null), 3500);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                >
                  Confirm Wipe All Data
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClean(false)}
                  className="px-2.5 py-1.5 text-xs font-medium border border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
