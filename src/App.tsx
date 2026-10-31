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

const MainLayout: React.FC = () => {
  const { activeTab, setIsLocked } = useApp();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Top Bar Navigation (Following Top Bar Contract) */}
      <TopNav
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onLockTerminal={() => setIsLocked(true)}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'pos' && <POSBilling />}
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'customers' && <CustomerManagement />}
        {activeTab === 'invoices' && <InvoicesList />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'users' && <UserManagement />}
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
