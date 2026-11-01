import { Product, Invoice, User, NotificationItem, StoreSettings, Customer } from '../types';
import { DEFAULT_GST_SLABS, normalizeGstSlabs } from './gst';

export const STORAGE_KEYS = {
  PRODUCTS: 'vyaparpos_products_v2',
  INVOICES: 'vyaparpos_invoices_v2',
  USERS: 'vyaparpos_users_v2',
  ACTIVE_USER: 'vyaparpos_active_user_v2',
  NOTIFICATIONS: 'vyaparpos_notifications_v2',
  SETTINGS: 'vyaparpos_settings_v2',
  THEME: 'vyaparpos_theme_v2',
  OFFLINE_QUEUE: 'vyaparpos_offline_queue_v2',
  CUSTOMERS: 'vyaparpos_customers_v2',
};

const LEGACY_V1_KEYS = [
  'vyaparpos_products_v1',
  'vyaparpos_invoices_v1',
  'vyaparpos_users_v1',
  'vyaparpos_active_user_v1',
  'vyaparpos_notifications_v1',
  'vyaparpos_settings_v1',
  'vyaparpos_offline_queue_v1',
  'vyaparpos_customers_v1',
];

let legacyPurged = false;
function ensureLegacyDemoPurged() {
  if (legacyPurged || typeof window === 'undefined') return;
  legacyPurged = true;
  try {
    LEGACY_V1_KEYS.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore storage access issues
  }
}

export const CLEAN_DEFAULT_USERS: User[] = [
  {
    id: 'usr-owner-1',
    name: 'Store Owner',
    role: 'admin',
    pin: '1234',
    email: '',
    avatarColor: 'bg-emerald-600',
    hasBiometrics: false,
  },
];

export const CLEAN_DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'My Store',
  tagline: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  upiVpa: '',
  currencySymbol: '₹',
  social: {
    whatsapp: '',
    instagram: '',
    facebook: '',
    googleMaps: '',
  },
  enablePushNotifications: false,
  soundEnabled: true,
  autoPrintReceipt: false,
  defaultTaxRate: 5,
  gstSlabs: DEFAULT_GST_SLABS,
  gstSupplyType: 'intrastate',
  gstPriceMode: 'exclusive',
};

export const StorageService = {
  getProducts(): Product[] {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    return [];
  },

  saveProducts(products: Product[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore
    }
  },

  getInvoices(): Invoice[] {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    return [];
  },

  saveInvoices(invoices: Invoice[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch {
      // ignore
    }
  },

  getUsers(): User[] {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(CLEAN_DEFAULT_USERS));
    return CLEAN_DEFAULT_USERS;
  },

  saveUsers(users: User[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  },

  getActiveUser(): User {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return CLEAN_DEFAULT_USERS[0];
  },

  saveActiveUser(user: User) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    } catch {
      // ignore
    }
  },

  getSettings(): StoreSettings {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...CLEAN_DEFAULT_SETTINGS,
          ...parsed,
          gstSlabs: normalizeGstSlabs(parsed.gstSlabs),
          gstSupplyType: parsed.gstSupplyType === 'interstate' ? 'interstate' : 'intrastate',
          gstPriceMode: parsed.gstPriceMode === 'inclusive' ? 'inclusive' : 'exclusive',
          social: {
            ...CLEAN_DEFAULT_SETTINGS.social,
            ...(parsed.social || {}),
          },
        };
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(CLEAN_DEFAULT_SETTINGS));
    return CLEAN_DEFAULT_SETTINGS;
  },

  saveSettings(settings: StoreSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  },

  getNotifications(): NotificationItem[] {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    return [];
  },

  saveNotifications(notifications: NotificationItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  },

  getCustomers(): Customer[] {
    ensureLegacyDemoPurged();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    return [];
  },

  saveCustomers(customers: Customer[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch {
      // ignore
    }
  },

  exportFullBackup(): string {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      storeSettings: this.getSettings(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      invoices: this.getInvoices(),
      users: this.getUsers(),
      notifications: this.getNotifications(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importFullBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.products && Array.isArray(parsed.products)) {
        this.saveProducts(parsed.products);
      }
      if (parsed.customers && Array.isArray(parsed.customers)) {
        this.saveCustomers(parsed.customers);
      }
      if (parsed.invoices && Array.isArray(parsed.invoices)) {
        this.saveInvoices(parsed.invoices);
      }
      if (parsed.users && Array.isArray(parsed.users) && parsed.users.length > 0) {
        this.saveUsers(parsed.users);
        this.saveActiveUser(parsed.users[0]);
      }
      if (parsed.storeSettings) {
        this.saveSettings(parsed.storeSettings);
      }
      if (parsed.notifications && Array.isArray(parsed.notifications)) {
        this.saveNotifications(parsed.notifications);
      }
      return true;
    } catch {
      return false;
    }
  },

  clearAllStoreData() {
    ensureLegacyDemoPurged();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(CLEAN_DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(CLEAN_DEFAULT_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(CLEAN_DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  },
};
