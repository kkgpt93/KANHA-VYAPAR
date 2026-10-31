/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopNav } from './components/TopNav';
import { POSBilling } from './components/POSBilling';
import { InventoryManagement } from './components/InventoryManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { InvoicesList } from './components/InvoicesList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { UserManagement } from './components/UserManagement';
import { SettingsBackup } from './components/SettingsBackup';
import { NotificationDrawer } from './components/NotificationDrawer';
import { BiometricLoginModal } from './components/BiometricLoginModal';
import { MobileNav } from './components/MobileNav';
import { LicenseManager } from './components/LicenseManager';
import { LicenseGateModal } from './components/LicenseGateModal';
import { DataSetupHub } from './components/DataSetupHub';
import { formatDate } from './utils/formatters';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, setIsLocked, licenseEvaluation } = useApp();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Top Bar Navigation */}
      <TopNav
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onLockTerminal={() => setIsLocked(true)}
      />

      {/* 2-Day Public License Countdown Strip */}
      {licenseEvaluation.status === 'public_trial_active' && (
        <div className="px-4 lg:px-6 py-2 bg-neutral-900 text-neutral-100 dark:bg-neutral-900 border-b border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-2 no-print">
          <span>
            2-दिवसीय पब्लिक लाइसेंस सक्रिय है —{' '}
            <strong className="font-mono tabular-nums text-amber-400">
              {licenseEvaluation.hoursRemaining} घंटे शेष
            </strong>{' '}
            (कुल 2 दिन / 48 घंटे वैधता)। स्थायी उपयोग के लिए 1-वर्षीय लाइसेंस की या Creator Login चुनें।
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('license')}
            className="px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
          >
            Upgrade / Switch Login
          </button>
        </div>
      )}

      {/* Annual License Renewal Reminder Strip (30 days or less remaining) */}
      {licenseEvaluation.status === 'expiring_soon' && (
        <div className="px-4 lg:px-6 py-2 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 no-print">
          <span>
            वार्षिक लाइसेंस <strong>{licenseEvaluation.daysRemaining} दिनों</strong> में समाप्त हो रहा है
            {licenseEvaluation.expiresAt ? ` (${formatDate(licenseEvaluation.expiresAt)})` : ''}।
            निरंतर बिलिंग के लिए नया 1-वर्षीय रिन्यूअल की दर्ज करें।
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('license')}
            className="px-3 py-1 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
          >
            Renew License Now
          </button>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'pos' && <POSBilling />}
        {activeTab === 'setup' && <DataSetupHub />}
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'customers' && <CustomerManagement />}
        {activeTab === 'invoices' && <InvoicesList />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'license' && <LicenseManager />}
        {activeTab === 'settings' && <SettingsBackup />}
      </main>

      {/* Mobile Touch Navigation */}
      <MobileNav />

      {/* Real-time Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Biometric / PIN Lock Screen */}
      <BiometricLoginModal />

      {/* Annual Software License Activation & Renewal Gate */}
      <LicenseGateModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
