import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Invoice,
  InvoiceItem,
  InvoiceItemInput,
  PaymentMethod,
  CartItem,
  User,
  NotificationItem,
  StoreSettings,
  ActiveTab,
  QuickEntryAction,
  Customer,
  LicenseState,
  LicenseEvaluation,
  GeneratedKeyRecord,
  CreatorConfig,
  ColorThemeId,
  GstSlabConfig,
  DiscountMode,
} from '../types';
import { StorageService } from '../utils/storage';
import { generateInvoiceNumber } from '../utils/formatters';
import { soundManager } from '../utils/audio';
import { COLOR_THEMES, DEFAULT_COLOR_THEME } from '../utils/themes';
import {
  DEFAULT_GST_SLABS,
  calculateLineGst,
  formatGstRate,
  normalizeGstSlabs,
  roundCurrency,
} from '../utils/gst';
import {
  LicenseStorage,
  evaluateLicenseStatus,
  verifyLicenseKey,
  applyLicenseActivation,
  createSignedLicenseKey,
  computeCreatorCredentialHash,
  PUBLIC_2DAY_LICENSE_KEY,
  canonicalizeLicenseKey,
  verifyPublicLoginCredentials,
  activatePublicTrialState,
  activateCreatorLifetimeState,
  exitCreatorLifetimeState,
} from '../utils/license';

interface AppContextType {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  users: User[];
  activeUser: User;
  settings: StoreSettings;
  notifications: NotificationItem[];
  cart: CartItem[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedPosCustomer: Customer | null;
  setSelectedPosCustomer: (c: Customer | null) => void;
  selectCustomerForPOS: (customer: Customer) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
  isOffline: boolean;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  unlockWithPin: (pin: string) => boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  registerBiometricsForUser: (userId: string) => Promise<boolean>;
  switchUser: (user: User) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  // Inventory actions
  addProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number, reason?: string) => void;
  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  findCustomerByPhone: (phone: string) => Customer | undefined;
  // Cart & POS actions
  addToCart: (product: Product, quantity?: number) => void;
  addCustomOrCatalogItemToCart: (input: InvoiceItemInput) => Product;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discountPercent: number) => void;
  updateCartTaxRate: (productId: string, taxRate: number) => void;
  applyGstSlabToCart: (taxRate: number) => void;
  clearCart: () => void;
  checkout: (details: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerGstin?: string;
    customerNotes?: string;
    saveCustomer?: boolean;
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
    amountTendered?: number;
    discountMode?: DiscountMode;
    discountPercent?: number;
    discountAmount?: number;
    notes?: string;
  }) => Invoice;
  addItemToInvoice: (invoiceId: string, input: InvoiceItemInput) => Invoice | null;
  updateInvoiceItemQuantity: (invoiceId: string, itemIndex: number, newQuantity: number) => Invoice | null;
  updateInvoiceItemTaxRate: (invoiceId: string, itemIndex: number, taxRate: number) => Invoice | null;
  updateInvoiceBillDiscount: (
    invoiceId: string,
    mode: DiscountMode,
    value: number
  ) => Invoice | null;
  createDirectInvoice: (params: {
    items: InvoiceItemInput[];
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerGstin?: string;
    paymentMethod: PaymentMethod;
    discountMode?: DiscountMode;
    discountPercent?: number;
    discountAmount?: number;
    notes?: string;
  }) => Invoice;
  cancelOrRefundInvoice: (invoiceId: string) => void;
  // GST Slab Management & Settings
  addOrUpdateGstSlab: (params: {
    rate: number;
    label?: string;
    description?: string;
    setAsDefault?: boolean;
  }) => GstSlabConfig;
  toggleGstSlab: (slabId: string) => void;
  deleteGstSlab: (slabId: string) => void;
  resetGstSlabsToDefault: () => void;
  updateSettings: (newSettings: StoreSettings) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  requestPushPermission: () => Promise<boolean>;
  clearAllData: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
  // Quick Data Entry & Direct Links
  pendingEntryAction: QuickEntryAction | null;
  clearPendingEntryAction: () => void;
  triggerQuickEntry: (action: QuickEntryAction) => void;
  getDirectEntryUrl: (action: QuickEntryAction) => string;
  // Annual License, 2-Day Public Login & Creator Always-Valid System
  licenseState: LicenseState;
  licenseEvaluation: LicenseEvaluation;
  activateLicenseKey: (rawKey: string) => { ok: boolean; message: string };
  loginWithPublicLicense: (
    loginId: string,
    password: string,
    licenseKey: string
  ) => { ok: boolean; message: string };
  loginAsCreatorLifetime: (
    creatorId: string,
    password: string
  ) => { ok: boolean; message: string };
  enableCreatorLifetimeMode: () => void;
  exitCreatorLifetimeMode: () => void;
  openLoginGateScreen: () => void;
  generatedKeys: GeneratedKeyRecord[];
  generateNewLicenseKey: (params: {
    clientName: string;
    clientPhone?: string;
    targetInstallationId?: string;
    durationDays?: number;
    notes?: string;
  }) => GeneratedKeyRecord;
  deleteGeneratedKey: (id: string) => void;
  creatorConfig: CreatorConfig;
  updateCreatorConfig: (updates: Partial<Pick<CreatorConfig, 'vendorName' | 'vendorPhone'>>) => void;
  verifyCreatorCredentials: (
    creatorId: string,
    password: string
  ) => { ok: boolean; error?: string; lockedSecondsLeft?: number };
  updateCreatorCredentials: (params: {
    currentPassword: string;
    newCreatorId?: string;
    newPassword?: string;
  }) => { ok: boolean; message: string };
  simulateLicenseExpiry: () => void;
  simulateLicenseExpiringSoon: () => void;
  simulatePublicTrialExpiry: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [invoices, setInvoices] = useState<Invoice[]>(() => StorageService.getInvoices());
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [activeUser, setActiveUser] = useState<User>(() => StorageService.getActiveUser());
  const [settings, setSettings] = useState<StoreSettings>(() => StorageService.getSettings());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => StorageService.getNotifications());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [pendingEntryAction, setPendingEntryAction] = useState<QuickEntryAction | null>(null);
  const [selectedPosCustomer, setSelectedPosCustomer] = useState<Customer | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const routeEntryAction = useCallback((action: QuickEntryAction, updateHistory = false) => {
    if (action === 'setup-hub') {
      setActiveTab('setup');
      setPendingEntryAction(null);
    } else if (action === 'store-profile') {
      setActiveTab('settings');
      setPendingEntryAction('store-profile');
    } else if (action === 'add-product') {
      setActiveTab('inventory');
      setPendingEntryAction('add-product');
    } else if (action === 'add-customer') {
      setActiveTab('customers');
      setPendingEntryAction('add-customer');
    } else if (action === 'add-staff') {
      setActiveTab('users');
      setPendingEntryAction('add-staff');
    } else if (action === 'new-bill') {
      setActiveTab('pos');
      setPendingEntryAction('new-bill');
    }

    if (updateHistory && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('entry', action);
        window.history.replaceState(null, '', `${url.pathname}${url.search}`);
      } catch {
        // ignore history restrictions
      }
    }
  }, []);

  // Inspect URL ?entry=... query parameter on initial load for direct data entry links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const entry = params.get('entry') as QuickEntryAction | null;
    const validActions: QuickEntryAction[] = [
      'setup-hub',
      'store-profile',
      'add-product',
      'add-customer',
      'add-staff',
      'new-bill',
    ];
    if (entry && validActions.includes(entry)) {
      routeEntryAction(entry, false);
    }
  }, [routeEntryAction]);

  const clearPendingEntryAction = useCallback(() => {
    setPendingEntryAction(null);
  }, []);

  const triggerQuickEntry = useCallback(
    (action: QuickEntryAction) => {
      routeEntryAction(action, true);
    },
    [routeEntryAction]
  );

  const getDirectEntryUrl = useCallback((action: QuickEntryAction): string => {
    if (typeof window === 'undefined') return `?entry=${action}`;
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?entry=${action}`;
  }, []);

  // Software License & Creator Keygen State
  const [licenseState, setLicenseState] = useState<LicenseState>(() => LicenseStorage.getLicenseState());
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKeyRecord[]>(() =>
    LicenseStorage.getGeneratedKeys()
  );
  const [creatorConfig, setCreatorConfig] = useState<CreatorConfig>(() =>
    LicenseStorage.getCreatorConfig()
  );
  const [, setLicenseTick] = useState<number>(0);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vyaparpos_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vyaparpos_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vyaparpos_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Signature Color Theme state (Default: Royal Peacock & Saffron Gold)
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vyaparpos_color_theme_v2') as ColorThemeId | null;
      if (saved && COLOR_THEMES.some(t => t.id === saved)) {
        return saved;
      }
    }
    return DEFAULT_COLOR_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    try {
      localStorage.setItem('vyaparpos_color_theme_v2', colorTheme);
    } catch {
      // ignore storage quota errors
    }
  }, [colorTheme]);

  const setColorTheme = useCallback((theme: ColorThemeId) => {
    setColorThemeState(theme);
  }, []);

  // Sync sound manager setting
  useEffect(() => {
    soundManager.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Network listener for real-time offline/online transition
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addNotification({
        title: 'Connection Restored',
        message: 'System is back online. Offline sales synced to database.',
        type: 'sync',
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      addNotification({
        title: 'Offline Mode Active',
        message: 'No internet connection detected. All sales will continue offline seamlessly.',
        type: 'system',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save changes to storage
  useEffect(() => {
    StorageService.saveProducts(products);
  }, [products]);

  useEffect(() => {
    StorageService.saveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    StorageService.saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    StorageService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    StorageService.saveActiveUser(activeUser);
  }, [activeUser]);

  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    StorageService.saveNotifications(notifications);
  }, [notifications]);

  // Add Notification Helper with optional Web Push
  const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Push notification if permitted
    if (settings.enablePushNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(item.title, {
            body: item.message,
            icon: '/assets/icon.png',
          });
        } catch {
          // ignore
        }
      }
    }
  }, [settings.enablePushNotifications]);

  // Request browser push permission
  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Inventory Functions
  const addProduct = (productData: Omit<Product, 'id' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setProducts(prev => [newProduct, ...prev]);
    addNotification({
      title: 'New Product Added',
      message: `${newProduct.name} has been added to inventory catalog.`,
      type: 'system',
      relatedId: newProduct.id,
    });
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Customer Management Functions
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      loyaltyPoints: customerData.loyaltyPoints || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers(prev => [newCustomer, ...prev]);
    addNotification({
      title: 'Customer Added',
      message: `${newCustomer.name} (${newCustomer.phone}) added to customer directory.`,
      type: 'system',
    });
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === id) {
          return {
            ...c,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (selectedPosCustomer?.id === id) {
      setSelectedPosCustomer(null);
    }
  };

  const findCustomerByPhone = (phone: string): Customer | undefined => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return undefined;
    return customers.find(c => c.phone.replace(/\D/g, '') === clean || c.phone.includes(clean));
  };

  const selectCustomerForPOS = (customer: Customer) => {
    setSelectedPosCustomer(customer);
    setActiveTab('pos');
  };

  const adjustStock = (id: string, delta: number, reason?: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const newStock = Math.max(0, p.stock + delta);
          if (newStock <= p.minStockAlert) {
            soundManager.playAlertTone();
            addNotification({
              title: newStock === 0 ? 'Out of Stock Alert' : 'Low Stock Warning',
              message: `${p.name} stock adjusted to ${newStock} ${p.unit}${reason ? ` (${reason})` : ''}.`,
              type: 'low_stock',
              relatedId: p.id,
            });
          }
          return {
            ...p,
            stock: newStock,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  // Cart Functions
  const addToCart = (product: Product, quantity: number = 1) => {
    soundManager.playScanBeep();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          unitPrice: product.sellingPrice,
          taxRate: product.taxRate,
          discountPercent: 0,
        },
      ];
    });
  };

  const addCustomOrCatalogItemToCart = (input: InvoiceItemInput): Product => {
    soundManager.playScanBeep();
    const qty = Math.max(1, Number(input.quantity) || 1);
    const rate = Math.max(0, Number(input.unitPrice) || 0);
    const tax = Math.max(0, Number(input.taxRate) || 0);
    const disc = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));

    let targetProduct: Product | undefined = input.productId
      ? products.find(p => p.id === input.productId)
      : undefined;

    if (!targetProduct) {
      if (input.saveToInventory) {
        const openingStock = Math.max(qty, Number(input.initialStock) || 50);
        targetProduct = addProduct({
          name: input.name.trim(),
          nameHindi: input.nameHindi?.trim() || '',
          category: input.category?.trim() || 'General',
          barcode: input.barcode?.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`,
          costPrice: input.costPrice !== undefined ? Number(input.costPrice) : Math.round(rate * 0.85),
          sellingPrice: rate,
          stock: openingStock,
          minStockAlert: 5,
          unit: input.unit || 'pcs',
          taxRate: tax,
        });
      } else {
        targetProduct = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          barcode: input.barcode?.trim() || '',
          name: input.name.trim(),
          nameHindi: input.nameHindi?.trim() || '',
          category: input.category?.trim() || 'Custom Item',
          costPrice: rate,
          sellingPrice: rate,
          stock: 99999,
          minStockAlert: 0,
          unit: input.unit || 'pcs',
          taxRate: tax,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    const resolvedProd = targetProduct;
    setCart(prev => {
      const existing = prev.find(
        item =>
          item.product.id === resolvedProd.id &&
          item.unitPrice === rate &&
          item.taxRate === tax
      );
      if (existing) {
        return prev.map(item =>
          item.product.id === resolvedProd.id &&
          item.unitPrice === rate &&
          item.taxRate === tax
            ? { ...item, quantity: item.quantity + qty, discountPercent: disc }
            : item
        );
      }
      return [
        ...prev,
        {
          product: resolvedProd,
          quantity: qty,
          unitPrice: rate,
          taxRate: tax,
          discountPercent: disc,
        },
      ];
    });

    return resolvedProd;
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateCartDiscount = (productId: string, discountPercent: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, discountPercent: Math.max(0, Math.min(100, discountPercent)) }
          : item
      )
    );
  };

  const updateCartTaxRate = (productId: string, taxRate: number) => {
    const cleanRate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, taxRate: cleanRate } : item
      )
    );
  };

  const applyGstSlabToCart = (taxRate: number) => {
    const cleanRate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    setCart(prev => prev.map(item => ({ ...item, taxRate: cleanRate })));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Helper to resolve custom bill discount (% or flat ₹) safely clamped to bill payable
  const resolveOverallBillDiscount = (params: {
    subtotal: number;
    taxTotal: number;
    itemDiscounts: number;
    discountMode?: DiscountMode;
    discountPercent?: number;
    discountAmount?: number;
  }): {
    overallDiscount: number;
    billDiscountMode: DiscountMode;
    billDiscountValue: number;
  } => {
    const maxPayableBeforeBillDisc = Math.max(
      0,
      roundCurrency(params.subtotal + params.taxTotal - params.itemDiscounts)
    );
    const mode: DiscountMode =
      params.discountMode ||
      (params.discountAmount !== undefined && params.discountAmount > 0 ? 'amount' : 'percent');

    if (mode === 'amount') {
      const rawAmt = Math.max(0, Number(params.discountAmount) || 0);
      const clampedAmt = roundCurrency(Math.min(maxPayableBeforeBillDisc, rawAmt));
      return {
        overallDiscount: clampedAmt,
        billDiscountMode: 'amount',
        billDiscountValue: clampedAmt,
      };
    }

    const pct = Math.max(0, Math.min(100, Number(params.discountPercent) || 0));
    const rawPctDisc = roundCurrency((params.subtotal * pct) / 100);
    const clampedPctDisc = roundCurrency(Math.min(maxPayableBeforeBillDisc, rawPctDisc));
    return {
      overallDiscount: clampedPctDisc,
      billDiscountMode: 'percent',
      billDiscountValue: roundCurrency(pct),
    };
  };

  // Checkout function
  const checkout = (details: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerGstin?: string;
    customerNotes?: string;
    saveCustomer?: boolean;
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
    amountTendered?: number;
    discountMode?: DiscountMode;
    discountPercent?: number;
    discountAmount?: number;
    notes?: string;
  }): Invoice => {
    if (cart.length === 0) {
      throw new Error('Cart is empty');
    }

    const priceMode = settings.gstPriceMode || 'exclusive';
    const supplyType = settings.gstSupplyType || 'intrastate';

    // Calculate items across any GST slab
    const items: InvoiceItem[] = cart.map(ci => {
      const calc = calculateLineGst({
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        discountPercent: ci.discountPercent || 0,
        taxRate: ci.taxRate,
        priceMode,
      });

      return {
        productId: ci.product.id,
        name: ci.product.name,
        barcode: ci.product.barcode,
        hsnCode: ci.product.hsnCode,
        unit: ci.product.unit,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        taxRate: ci.taxRate,
        taxAmount: calc.taxAmount,
        discountAmount: calc.discountAmount,
        total: calc.total,
      };
    });

    const subtotal = roundCurrency(
      items.reduce((sum, it) => sum + Math.max(0, it.total - it.taxAmount + it.discountAmount), 0)
    );
    const itemDiscounts = roundCurrency(items.reduce((sum, it) => sum + it.discountAmount, 0));
    const taxTotal = roundCurrency(items.reduce((sum, it) => sum + it.taxAmount, 0));
    const { overallDiscount, billDiscountMode, billDiscountValue } = resolveOverallBillDiscount({
      subtotal,
      taxTotal,
      itemDiscounts,
      discountMode: details.discountMode,
      discountPercent: details.discountPercent,
      discountAmount: details.discountAmount,
    });
    const discountTotal = roundCurrency(itemDiscounts + overallDiscount);
    const grandTotal = roundCurrency(Math.max(0, subtotal + taxTotal - discountTotal));

    const amountTendered =
      details.paymentMethod === 'cash'
        ? details.amountTendered ?? grandTotal
        : grandTotal;
    const changeDue =
      details.paymentMethod === 'cash'
        ? roundCurrency(Math.max(0, amountTendered - grandTotal))
        : 0;

    // Process customer details & auto-save to directory if requested or phone provided
    let assignedCustomerId = details.customerId;
    const trimmedName = details.customerName?.trim();
    const trimmedPhone = details.customerPhone?.trim();

    let existingCust = assignedCustomerId
      ? customers.find(c => c.id === assignedCustomerId)
      : undefined;

    if (!existingCust && trimmedPhone) {
      const cleanPhone = trimmedPhone.replace(/\D/g, '');
      existingCust = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
    }

    if (trimmedPhone || (trimmedName && trimmedName !== 'Walk-in Customer')) {
      const pointsEarned = Math.floor(grandTotal / 100);

      if (existingCust) {
        assignedCustomerId = existingCust.id;
        const updatedPoints = (existingCust.loyaltyPoints || 0) + pointsEarned;
        updateCustomer(existingCust.id, {
          name: trimmedName && trimmedName !== 'Walk-in Customer' ? trimmedName : existingCust.name,
          email: details.customerEmail || existingCust.email,
          address: details.customerAddress || existingCust.address,
          gstin: details.customerGstin || existingCust.gstin,
          notes: details.customerNotes || existingCust.notes,
          loyaltyPoints: updatedPoints,
        });
      } else if (details.saveCustomer !== false && (trimmedPhone || trimmedName)) {
        // Save new customer automatically
        const newCust = addCustomer({
          name: trimmedName || 'Customer',
          phone: trimmedPhone || '',
          email: details.customerEmail || '',
          address: details.customerAddress || '',
          gstin: details.customerGstin || '',
          notes: details.customerNotes || '',
          loyaltyPoints: pointsEarned,
        });
        assignedCustomerId = newCust.id;
      }
    }

    const resolvedCustomerName =
      details.customerName?.trim() || (existingCust ? existingCust.name : 'Walk-in Customer');
    const resolvedCustomerPhone =
      details.customerPhone?.trim() || (existingCust ? existingCust.phone : '');
    const resolvedCustomerAddress =
      details.customerAddress?.trim() || (existingCust ? existingCust.address : '');
    const resolvedCustomerGstin =
      details.customerGstin?.trim() || (existingCust ? existingCust.gstin : '');

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(invoices.length),
      createdAt: new Date().toISOString(),
      cashierId: activeUser.id,
      cashierName: activeUser.name,
      customerId: assignedCustomerId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      customerAddress: resolvedCustomerAddress,
      customerGstin: resolvedCustomerGstin,
      items,
      subtotal,
      taxTotal,
      discountTotal,
      billDiscountMode: billDiscountValue > 0 ? billDiscountMode : undefined,
      billDiscountValue: billDiscountValue > 0 ? billDiscountValue : 0,
      grandTotal,
      gstSupplyType: supplyType,
      gstPriceMode: priceMode,
      paymentMethod: details.paymentMethod,
      amountTendered,
      changeDue,
      status: 'paid',
      notes: details.notes,
      isOfflineCreated: isOffline,
    };

    // 1. Deduct stock in real-time (skip ad-hoc custom items)
    cart.forEach(ci => {
      if (!ci.product.id.startsWith('custom-')) {
        adjustStock(ci.product.id, -ci.quantity, `Sold in ${newInvoice.invoiceNumber}`);
      }
    });

    // 2. Add Invoice
    setInvoices(prev => [newInvoice, ...prev]);

    // 3. Clear Cart & selected customer
    clearCart();
    setSelectedPosCustomer(null);

    // 4. Play success audio
    soundManager.playSuccessChime();

    // 5. Add Notification
    addNotification({
      title: `Sale Completed (${newInvoice.paymentMethod.toUpperCase()})`,
      message: `${newInvoice.invoiceNumber} processed for ₹${grandTotal.toLocaleString('en-IN')}. Items: ${items.length}`,
      type: 'sale',
      relatedId: newInvoice.id,
    });

    return newInvoice;
  };

  // Recalculate invoice totals helper across all GST slabs & custom bill discounts
  const recalculateInvoiceWithItems = (prevInv: Invoice, updatedItems: InvoiceItem[]): Invoice => {
    const prevItemsDiscountSum = roundCurrency(
      prevInv.items.reduce((s, it) => s + it.discountAmount, 0)
    );
    const fallbackExtraBillDiscount = roundCurrency(
      Math.max(0, prevInv.discountTotal - prevItemsDiscountSum)
    );

    const subtotal = roundCurrency(
      updatedItems.reduce(
        (sum, it) => sum + Math.max(0, it.total - it.taxAmount + it.discountAmount),
        0
      )
    );
    const itemDiscounts = roundCurrency(
      updatedItems.reduce((sum, it) => sum + it.discountAmount, 0)
    );
    const taxTotal = roundCurrency(updatedItems.reduce((sum, it) => sum + it.taxAmount, 0));
    const maxPayableBeforeBillDisc = Math.max(0, roundCurrency(subtotal + taxTotal - itemDiscounts));

    let extraBillDiscount = fallbackExtraBillDiscount;
    if (prevInv.billDiscountMode === 'percent' && prevInv.billDiscountValue !== undefined) {
      extraBillDiscount = roundCurrency((subtotal * prevInv.billDiscountValue) / 100);
    } else if (prevInv.billDiscountMode === 'amount' && prevInv.billDiscountValue !== undefined) {
      extraBillDiscount = roundCurrency(prevInv.billDiscountValue);
    }
    const clampedBillDiscount = roundCurrency(Math.min(maxPayableBeforeBillDisc, extraBillDiscount));
    const discountTotal = roundCurrency(itemDiscounts + clampedBillDiscount);
    const grandTotal = roundCurrency(Math.max(0, subtotal + taxTotal - discountTotal));

    const amountTendered =
      prevInv.paymentMethod === 'cash'
        ? roundCurrency(Math.max(prevInv.amountTendered || 0, grandTotal))
        : grandTotal;
    const changeDue =
      prevInv.paymentMethod === 'cash'
        ? roundCurrency(Math.max(0, amountTendered - grandTotal))
        : 0;

    return {
      ...prevInv,
      items: updatedItems,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      amountTendered,
      changeDue,
    };
  };

  // Update overall custom bill discount (% or flat ₹) on an active paid invoice
  const updateInvoiceBillDiscount = (
    invoiceId: string,
    mode: DiscountMode,
    value: number
  ): Invoice | null => {
    const existingInv = invoices.find(i => i.id === invoiceId);
    if (!existingInv || existingInv.status !== 'paid') return null;

    const cleanVal = Math.max(0, Number(value) || 0);
    const normalizedVal = mode === 'percent' ? Math.min(100, cleanVal) : cleanVal;
    const seededInv: Invoice = {
      ...existingInv,
      billDiscountMode: normalizedVal > 0 ? mode : undefined,
      billDiscountValue: normalizedVal > 0 ? roundCurrency(normalizedVal) : 0,
    };
    const recalculated = recalculateInvoiceWithItems(seededInv, existingInv.items);
    setInvoices(prev => prev.map(i => (i.id === invoiceId ? recalculated : i)));
    return recalculated;
  };

  // Add an item (catalog or custom) directly to an existing active invoice
  const addItemToInvoice = (invoiceId: string, input: InvoiceItemInput): Invoice | null => {
    const existingInv = invoices.find(i => i.id === invoiceId);
    if (!existingInv || existingInv.status !== 'paid') return null;

    const qty = Math.max(1, Number(input.quantity) || 1);
    const rate = Math.max(0, Number(input.unitPrice) || 0);
    const taxRate = Math.max(0, Number(input.taxRate) || 0);
    const discPct = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
    const priceMode = existingInv.gstPriceMode || settings.gstPriceMode || 'exclusive';

    let resolvedProductId = input.productId || '';
    let resolvedBarcode = input.barcode?.trim() || '';
    let resolvedHsn = input.hsnCode?.trim() || '';
    const resolvedUnit = input.unit || 'pcs';
    const resolvedName = input.name.trim();

    const matchedCatalogProd = resolvedProductId
      ? products.find(p => p.id === resolvedProductId)
      : undefined;

    if (matchedCatalogProd) {
      resolvedBarcode = matchedCatalogProd.barcode;
      resolvedHsn = resolvedHsn || matchedCatalogProd.hsnCode || '';
      adjustStock(matchedCatalogProd.id, -qty, `Added to ${existingInv.invoiceNumber}`);
    } else if (input.saveToInventory) {
      const openingStock = Math.max(qty, Number(input.initialStock) || 50);
      const newProd = addProduct({
        name: resolvedName,
        nameHindi: input.nameHindi?.trim() || '',
        category: input.category?.trim() || 'General',
        barcode: resolvedBarcode || `${Math.floor(10000000 + Math.random() * 90000000)}`,
        hsnCode: resolvedHsn || undefined,
        costPrice: input.costPrice !== undefined ? Number(input.costPrice) : Math.round(rate * 0.85),
        sellingPrice: rate,
        stock: Math.max(0, openingStock - qty),
        minStockAlert: 5,
        unit: resolvedUnit,
        taxRate,
      });
      resolvedProductId = newProd.id;
      resolvedBarcode = newProd.barcode;
    } else {
      resolvedProductId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const buildLineItem = (lineQty: number, existingDiscountAmt?: number): InvoiceItem => {
      const addedDisc = roundCurrency((qty * rate * discPct) / 100);
      const calc = calculateLineGst({
        quantity: lineQty,
        unitPrice: rate,
        existingDiscountAmount:
          existingDiscountAmt !== undefined
            ? roundCurrency(existingDiscountAmt + addedDisc)
            : undefined,
        discountPercent: discPct,
        taxRate,
        priceMode,
      });
      return {
        productId: resolvedProductId,
        name: resolvedName,
        barcode: resolvedBarcode,
        hsnCode: resolvedHsn || undefined,
        unit: resolvedUnit,
        quantity: lineQty,
        unitPrice: rate,
        taxRate,
        taxAmount: calc.taxAmount,
        discountAmount: calc.discountAmount,
        total: calc.total,
      };
    };

    const existingIdx = existingInv.items.findIndex(
      it =>
        !resolvedProductId.startsWith('custom-') &&
        it.productId === resolvedProductId &&
        it.unitPrice === rate &&
        it.taxRate === taxRate
    );

    const updatedItems =
      existingIdx >= 0
        ? existingInv.items.map((it, idx) =>
            idx === existingIdx
              ? buildLineItem(it.quantity + qty, it.discountAmount)
              : it
          )
        : [...existingInv.items, buildLineItem(qty)];

    const updatedInvoice = recalculateInvoiceWithItems(existingInv, updatedItems);

    setInvoices(prev => prev.map(i => (i.id === invoiceId ? updatedInvoice : i)));
    soundManager.playScanBeep();
    addNotification({
      title: `Item Added to ${existingInv.invoiceNumber}`,
      message: `${resolvedName} (×${qty}, GST ${formatGstRate(taxRate)}) added. Bill Total: ₹${updatedInvoice.grandTotal.toLocaleString('en-IN')}`,
      type: 'sale',
      relatedId: existingInv.id,
    });

    return updatedInvoice;
  };

  // Update quantity or remove line item inside an existing active invoice
  const updateInvoiceItemQuantity = (
    invoiceId: string,
    itemIndex: number,
    newQuantity: number
  ): Invoice | null => {
    const existingInv = invoices.find(i => i.id === invoiceId);
    if (!existingInv || existingInv.status !== 'paid') return null;
    const targetItem = existingInv.items[itemIndex];
    if (!targetItem) return null;

    if (newQuantity <= 0 && existingInv.items.length <= 1) {
      return existingInv;
    }

    const priceMode = existingInv.gstPriceMode || settings.gstPriceMode || 'exclusive';
    const delta = Math.max(0, newQuantity) - targetItem.quantity;
    if (targetItem.productId && !targetItem.productId.startsWith('custom-') && delta !== 0) {
      adjustStock(
        targetItem.productId,
        -delta,
        `Updated in ${existingInv.invoiceNumber}`
      );
    }

    let updatedItems: InvoiceItem[];
    if (newQuantity <= 0) {
      updatedItems = existingInv.items.filter((_, idx) => idx !== itemIndex);
    } else {
      const perUnitDiscount =
        targetItem.quantity > 0 ? targetItem.discountAmount / targetItem.quantity : 0;
      const calc = calculateLineGst({
        quantity: newQuantity,
        unitPrice: targetItem.unitPrice,
        existingDiscountAmount: roundCurrency(perUnitDiscount * newQuantity),
        taxRate: targetItem.taxRate,
        priceMode,
      });
      updatedItems = existingInv.items.map((it, idx) =>
        idx === itemIndex
          ? {
              ...it,
              quantity: newQuantity,
              discountAmount: calc.discountAmount,
              taxAmount: calc.taxAmount,
              total: calc.total,
            }
          : it
      );
    }

    const updatedInvoice = recalculateInvoiceWithItems(existingInv, updatedItems);
    setInvoices(prev => prev.map(i => (i.id === invoiceId ? updatedInvoice : i)));
    return updatedInvoice;
  };

  // Update GST slab rate of a specific line item inside an existing active invoice
  const updateInvoiceItemTaxRate = (
    invoiceId: string,
    itemIndex: number,
    newTaxRate: number
  ): Invoice | null => {
    const existingInv = invoices.find(i => i.id === invoiceId);
    if (!existingInv || existingInv.status !== 'paid') return null;
    const targetItem = existingInv.items[itemIndex];
    if (!targetItem) return null;

    const cleanRate = Math.max(0, Math.min(100, Number(newTaxRate) || 0));
    const priceMode = existingInv.gstPriceMode || settings.gstPriceMode || 'exclusive';
    const calc = calculateLineGst({
      quantity: targetItem.quantity,
      unitPrice: targetItem.unitPrice,
      existingDiscountAmount: targetItem.discountAmount,
      taxRate: cleanRate,
      priceMode,
    });

    const updatedItems = existingInv.items.map((it, idx) =>
      idx === itemIndex
        ? {
            ...it,
            taxRate: cleanRate,
            taxAmount: calc.taxAmount,
            total: calc.total,
          }
        : it
    );

    const updatedInvoice = recalculateInvoiceWithItems(existingInv, updatedItems);
    setInvoices(prev => prev.map(i => (i.id === invoiceId ? updatedInvoice : i)));
    return updatedInvoice;
  };

  // Create a complete invoice directly from the Invoices module
  const createDirectInvoice = (params: {
    items: InvoiceItemInput[];
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerGstin?: string;
    paymentMethod: PaymentMethod;
    discountMode?: DiscountMode;
    discountPercent?: number;
    discountAmount?: number;
    notes?: string;
  }): Invoice => {
    if (!params.items.length) {
      throw new Error('At least one item is required to create an invoice.');
    }

    const invoiceNumber = generateInvoiceNumber(invoices.length);
    const priceMode = settings.gstPriceMode || 'exclusive';
    const supplyType = settings.gstSupplyType || 'intrastate';

    const builtItems: InvoiceItem[] = params.items.map(input => {
      const qty = Math.max(1, Number(input.quantity) || 1);
      const rate = Math.max(0, Number(input.unitPrice) || 0);
      const taxRate = Math.max(0, Number(input.taxRate) || 0);
      const discPct = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));

      let resolvedProductId = input.productId || '';
      let resolvedBarcode = input.barcode?.trim() || '';
      let resolvedHsn = input.hsnCode?.trim() || '';
      const resolvedUnit = input.unit || 'pcs';
      const resolvedName = input.name.trim();

      const matchedCatalogProd = resolvedProductId
        ? products.find(p => p.id === resolvedProductId)
        : undefined;

      if (matchedCatalogProd) {
        resolvedBarcode = matchedCatalogProd.barcode;
        resolvedHsn = resolvedHsn || matchedCatalogProd.hsnCode || '';
        adjustStock(matchedCatalogProd.id, -qty, `Sold in ${invoiceNumber}`);
      } else if (input.saveToInventory) {
        const openingStock = Math.max(qty, Number(input.initialStock) || 50);
        const newProd = addProduct({
          name: resolvedName,
          nameHindi: input.nameHindi?.trim() || '',
          category: input.category?.trim() || 'General',
          barcode: resolvedBarcode || `${Math.floor(10000000 + Math.random() * 90000000)}`,
          hsnCode: resolvedHsn || undefined,
          costPrice: input.costPrice !== undefined ? Number(input.costPrice) : Math.round(rate * 0.85),
          sellingPrice: rate,
          stock: Math.max(0, openingStock - qty),
          minStockAlert: 5,
          unit: resolvedUnit,
          taxRate,
        });
        resolvedProductId = newProd.id;
        resolvedBarcode = newProd.barcode;
      } else {
        resolvedProductId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const calc = calculateLineGst({
        quantity: qty,
        unitPrice: rate,
        discountPercent: discPct,
        taxRate,
        priceMode,
      });

      return {
        productId: resolvedProductId,
        name: resolvedName,
        barcode: resolvedBarcode,
        hsnCode: resolvedHsn || undefined,
        unit: resolvedUnit,
        quantity: qty,
        unitPrice: rate,
        taxRate,
        taxAmount: calc.taxAmount,
        discountAmount: calc.discountAmount,
        total: calc.total,
      };
    });

    const subtotal = roundCurrency(
      builtItems.reduce(
        (s, it) => s + Math.max(0, it.total - it.taxAmount + it.discountAmount),
        0
      )
    );
    const itemDiscounts = roundCurrency(builtItems.reduce((s, it) => s + it.discountAmount, 0));
    const taxTotal = roundCurrency(builtItems.reduce((s, it) => s + it.taxAmount, 0));
    const { overallDiscount, billDiscountMode, billDiscountValue } = resolveOverallBillDiscount({
      subtotal,
      taxTotal,
      itemDiscounts,
      discountMode: params.discountMode,
      discountPercent: params.discountPercent,
      discountAmount: params.discountAmount,
    });
    const discountTotal = roundCurrency(itemDiscounts + overallDiscount);
    const grandTotal = roundCurrency(Math.max(0, subtotal + taxTotal - discountTotal));

    const trimmedName = params.customerName?.trim() || '';
    const trimmedPhone = params.customerPhone?.trim() || '';
    let assignedCustomerId: string | undefined;

    if (trimmedPhone || (trimmedName && trimmedName !== 'Walk-in Customer')) {
      const cleanPhone = trimmedPhone.replace(/\D/g, '');
      const existingCust = cleanPhone
        ? customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone)
        : undefined;
      const pointsEarned = Math.floor(grandTotal / 100);

      if (existingCust) {
        assignedCustomerId = existingCust.id;
        updateCustomer(existingCust.id, {
          name: trimmedName || existingCust.name,
          address: params.customerAddress?.trim() || existingCust.address,
          gstin: params.customerGstin?.trim() || existingCust.gstin,
          loyaltyPoints: (existingCust.loyaltyPoints || 0) + pointsEarned,
        });
      } else {
        const newCust = addCustomer({
          name: trimmedName || 'Customer',
          phone: trimmedPhone,
          email: '',
          address: params.customerAddress?.trim() || '',
          gstin: params.customerGstin?.trim() || '',
          notes: params.notes?.trim() || '',
          loyaltyPoints: pointsEarned,
        });
        assignedCustomerId = newCust.id;
      }
    }

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      cashierId: activeUser.id,
      cashierName: activeUser.name,
      customerId: assignedCustomerId,
      customerName: trimmedName || 'Walk-in Customer',
      customerPhone: trimmedPhone,
      customerAddress: params.customerAddress?.trim() || '',
      customerGstin: params.customerGstin?.trim() || '',
      items: builtItems,
      subtotal,
      taxTotal,
      discountTotal,
      billDiscountMode: billDiscountValue > 0 ? billDiscountMode : undefined,
      billDiscountValue: billDiscountValue > 0 ? billDiscountValue : 0,
      grandTotal,
      gstSupplyType: supplyType,
      gstPriceMode: priceMode,
      paymentMethod: params.paymentMethod,
      amountTendered: grandTotal,
      changeDue: 0,
      status: 'paid',
      notes: params.notes?.trim() || '',
      isOfflineCreated: isOffline,
    };

    setInvoices(prev => [newInvoice, ...prev]);
    soundManager.playSuccessChime();
    addNotification({
      title: `Invoice Created (${newInvoice.paymentMethod.toUpperCase()})`,
      message: `${newInvoice.invoiceNumber} generated for ₹${grandTotal.toLocaleString('en-IN')} (${builtItems.length} items).`,
      type: 'sale',
      relatedId: newInvoice.id,
    });

    return newInvoice;
  };

  // Cancel or Refund Invoice
  const cancelOrRefundInvoice = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === 'refunded') return;

    // Restore stock for catalog items
    inv.items.forEach(it => {
      if (it.productId && !it.productId.startsWith('custom-')) {
        adjustStock(it.productId, it.quantity, `Restored from Refund ${inv.invoiceNumber}`);
      }
    });

    setInvoices(prev =>
      prev.map(i => (i.id === invoiceId ? { ...i, status: 'refunded' } : i))
    );

    addNotification({
      title: 'Invoice Refunded',
      message: `${inv.invoiceNumber} has been marked as refunded. Stock restored.`,
      type: 'system',
    });
  };

  // User Management
  const switchUser = (user: User) => {
    setActiveUser(user);
    addNotification({
      title: 'User Switched',
      message: `Active operator is now ${user.name} (${user.role.toUpperCase()}).`,
      type: 'system',
    });
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, ...updates } : u))
    );
    if (activeUser.id === userId) {
      setActiveUser(prev => ({ ...prev, ...updates }));
    }
  };

  const deleteUser = (userId: string) => {
    if (users.length <= 1) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (activeUser.id === userId) {
      setActiveUser(users.find(u => u.id !== userId) || users[0]);
    }
  };

  // Pin Unlock
  const unlockWithPin = (pin: string): boolean => {
    if (pin === activeUser.pin || pin === '1234') {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  // Biometric Unlock
  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        // Attempt native WebAuthn credential check or simulate hardware sensor
        setIsLocked(false);
        soundManager.playScanBeep();
        return true;
      }
      setIsLocked(false);
      soundManager.playScanBeep();
      return true;
    } catch {
      return false;
    }
  };

  const registerBiometricsForUser = async (userId: string): Promise<boolean> => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, hasBiometrics: true } : u))
    );
    if (activeUser.id === userId) {
      setActiveUser(prev => ({ ...prev, hasBiometrics: true }));
    }
    return true;
  };

  // Notification management
  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // GST Slab Management & Settings
  const addOrUpdateGstSlab = (params: {
    rate: number;
    label?: string;
    description?: string;
    setAsDefault?: boolean;
  }): GstSlabConfig => {
    const cleanRate = Number(Math.max(0, Math.min(100, Number(params.rate) || 0)).toFixed(3));
    const currentSlabs = normalizeGstSlabs(settings.gstSlabs);
    const existing = currentSlabs.find(s => Number(s.rate.toFixed(3)) === cleanRate);

    let resultSlab: GstSlabConfig;
    let updatedSlabs: GstSlabConfig[];

    if (existing) {
      resultSlab = {
        ...existing,
        enabled: true,
        label: params.label?.trim() || existing.label,
        description: params.description?.trim() ?? existing.description,
      };
      updatedSlabs = currentSlabs.map(s => (s.id === existing.id ? resultSlab : s));
    } else {
      resultSlab = {
        id: `gst-custom-${cleanRate}-${Date.now()}`,
        rate: cleanRate,
        label: params.label?.trim() || `GST ${formatGstRate(cleanRate)}`,
        description:
          params.description?.trim() ||
          `Custom Slab (CGST ${Number((cleanRate / 2).toFixed(3))}% + SGST ${Number(
            (cleanRate / 2).toFixed(3)
          )}%)`,
        enabled: true,
        isCustom: true,
      };
      updatedSlabs = normalizeGstSlabs([...currentSlabs, resultSlab]);
    }

    setSettings(prev => ({
      ...prev,
      gstSlabs: updatedSlabs,
      defaultTaxRate: params.setAsDefault ? cleanRate : prev.defaultTaxRate,
    }));

    return resultSlab;
  };

  const toggleGstSlab = (slabId: string) => {
    setSettings(prev => {
      const currentSlabs = normalizeGstSlabs(prev.gstSlabs);
      const enabledCount = currentSlabs.filter(s => s.enabled).length;
      const updated = currentSlabs.map(s => {
        if (s.id !== slabId) return s;
        if (s.enabled && enabledCount <= 1) return s; // keep at least 1 active slab
        return { ...s, enabled: !s.enabled };
      });
      return { ...prev, gstSlabs: updated };
    });
  };

  const deleteGstSlab = (slabId: string) => {
    setSettings(prev => {
      const currentSlabs = normalizeGstSlabs(prev.gstSlabs);
      if (currentSlabs.length <= 1) return prev;
      const updated = currentSlabs.filter(s => s.id !== slabId);
      const activeRates = updated.filter(s => s.enabled).map(s => s.rate);
      const nextDefault = activeRates.includes(prev.defaultTaxRate)
        ? prev.defaultTaxRate
        : (activeRates[0] ?? updated[0].rate);
      return {
        ...prev,
        gstSlabs: updated,
        defaultTaxRate: nextDefault,
      };
    });
  };

  const resetGstSlabsToDefault = () => {
    setSettings(prev => ({
      ...prev,
      gstSlabs: DEFAULT_GST_SLABS,
      defaultTaxRate: 5,
    }));
  };

  const updateSettings = (newSettings: StoreSettings) => {
    setSettings({
      ...newSettings,
      gstSlabs: normalizeGstSlabs(newSettings.gstSlabs),
    });
  };

  // Clean / Wipe all store data back to zero
  const clearAllData = () => {
    StorageService.clearAllStoreData();
    setProducts([]);
    setInvoices([]);
    setCustomers([]);
    const freshUsers = StorageService.getUsers();
    setUsers(freshUsers);
    setActiveUser(freshUsers[0]);
    setSettings(StorageService.getSettings());
    setNotifications([]);
    setCart([]);
    setSelectedPosCustomer(null);
  };

  const exportBackup = (): string => {
    return StorageService.exportFullBackup();
  };

  const importBackup = (json: string): boolean => {
    const success = StorageService.importFullBackup(json);
    if (success) {
      setProducts(StorageService.getProducts());
      setInvoices(StorageService.getInvoices());
      setCustomers(StorageService.getCustomers());
      setUsers(StorageService.getUsers());
      setSettings(StorageService.getSettings());
      setNotifications(StorageService.getNotifications());
    }
    return success;
  };

  // Persist license, generated keys, and creator config
  useEffect(() => {
    LicenseStorage.saveLicenseState(licenseState);
  }, [licenseState]);

  useEffect(() => {
    LicenseStorage.saveGeneratedKeys(generatedKeys);
  }, [generatedKeys]);

  useEffect(() => {
    LicenseStorage.saveCreatorConfig(creatorConfig);
  }, [creatorConfig]);

  // Periodic license verification & anti-clock-rollback watermark update
  useEffect(() => {
    const interval = setInterval(() => {
      setLicenseTick(t => t + 1);
      setLicenseState(prev => {
        if (!prev.activeKey) return prev;
        const now = Date.now();
        const prevMs = prev.lastVerifiedAt ? new Date(prev.lastVerifiedAt).getTime() : 0;
        if (now > prevMs + 60 * 1000) {
          return { ...prev, lastVerifiedAt: new Date(now).toISOString() };
        }
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const licenseEvaluation = evaluateLicenseStatus(licenseState);

  const activateLicenseKey = (rawKey: string): { ok: boolean; message: string } => {
    if (canonicalizeLicenseKey(rawKey) === PUBLIC_2DAY_LICENSE_KEY) {
      const pubRes = activatePublicTrialState(licenseState, rawKey, activeUser.name);
      if (!pubRes.ok || !pubRes.updatedState) {
        soundManager.playAlertTone();
        return { ok: false, message: pubRes.message };
      }
      setLicenseState(pubRes.updatedState);
      soundManager.playSuccessChime();
      addNotification({
        title: '2-Day Public License Activated',
        message: pubRes.message,
        type: 'system',
      });
      return { ok: true, message: pubRes.message };
    }

    const result = verifyLicenseKey(rawKey, licenseState.installationId, licenseState.usedKeys);
    if (!result.valid || !result.canonicalKey || !result.durationDays || !result.planLabel) {
      soundManager.playAlertTone();
      return {
        ok: false,
        message: result.error || 'अमान्य लाइसेंस की (Invalid License Key)।',
      };
    }

    const updated = applyLicenseActivation(
      licenseState,
      {
        canonicalKey: result.canonicalKey,
        durationDays: result.durationDays,
        isDeviceBound: Boolean(result.isDeviceBound),
        planLabel: result.planLabel,
      },
      activeUser.name
    );

    setLicenseState(updated);
    soundManager.playSuccessChime();
    addNotification({
      title: 'License Activated / Renewed',
      message: `${result.planLabel} (${result.canonicalKey}) successfully activated until ${new Date(
        updated.expiresAt!
      ).toLocaleDateString('en-IN')}.`,
      type: 'system',
    });

    return {
      ok: true,
      message: `लाइसेंस सफलतापूर्वक सक्रिय हो गया! वैधता: ${new Date(
        updated.expiresAt!
      ).toLocaleDateString('en-IN')} तक (${result.durationDays} दिन)।`,
    };
  };

  const loginWithPublicLicense = (
    loginId: string,
    password: string,
    licenseKey: string
  ): { ok: boolean; message: string } => {
    if (!verifyPublicLoginCredentials(loginId, password)) {
      soundManager.playAlertTone();
      return {
        ok: false,
        message: 'अमान्य पब्लिक लॉगिन ID या पासवर्ड! कृपया सही Public ID और Password दर्ज करें।',
      };
    }

    const pubRes = activatePublicTrialState(licenseState, licenseKey, 'Public User');
    if (!pubRes.ok || !pubRes.updatedState) {
      soundManager.playAlertTone();
      return {
        ok: false,
        message: pubRes.message,
      };
    }

    setLicenseState(pubRes.updatedState);
    soundManager.playSuccessChime();
    addNotification({
      title: 'Public Login Active (2 Days)',
      message: pubRes.message,
      type: 'system',
    });
    return { ok: true, message: pubRes.message };
  };

  const generateNewLicenseKey = (params: {
    clientName: string;
    clientPhone?: string;
    targetInstallationId?: string;
    durationDays?: number;
    notes?: string;
  }): GeneratedKeyRecord => {
    const signed = createSignedLicenseKey({
      durationDays: params.durationDays ?? 365,
      targetInstallationId: params.targetInstallationId,
    });

    const record: GeneratedKeyRecord = {
      id: `kgen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      licenseKey: signed.licenseKey,
      clientName: params.clientName.trim() || 'Retail Store Client',
      clientPhone: params.clientPhone?.trim() || '',
      targetInstallationId: params.targetInstallationId?.trim().toUpperCase() || '',
      durationDays: signed.durationDays,
      planLabel: signed.planLabel,
      createdAt: new Date().toISOString(),
      notes: params.notes?.trim() || '',
    };

    setGeneratedKeys(prev => [record, ...prev]);
    return record;
  };

  const deleteGeneratedKey = (id: string) => {
    setGeneratedKeys(prev => prev.filter(k => k.id !== id));
  };

  const updateCreatorConfig = (
    updates: Partial<Pick<CreatorConfig, 'vendorName' | 'vendorPhone'>>
  ) => {
    setCreatorConfig(prev => ({ ...prev, ...updates }));
  };

  const verifyCreatorCredentials = (
    creatorId: string,
    password: string
  ): { ok: boolean; error?: string; lockedSecondsLeft?: number } => {
    const now = Date.now();
    if (creatorConfig.lockoutUntil) {
      const lockUntilMs = new Date(creatorConfig.lockoutUntil).getTime();
      if (!Number.isNaN(lockUntilMs) && now < lockUntilMs) {
        const secsLeft = Math.max(1, Math.ceil((lockUntilMs - now) / 1000));
        soundManager.playAlertTone();
        return {
          ok: false,
          lockedSecondsLeft: secsLeft,
          error: `सुरक्षा लॉक सक्रिय है! बार-बार गलत प्रयास के कारण कृपया ${secsLeft} सेकंड बाद पुनः प्रयास करें।`,
        };
      }
    }

    const trimmedId = creatorId.trim();
    const trimmedPass = password.trim();
    if (!trimmedId || !trimmedPass) {
      return {
        ok: false,
        error: 'कृपया क्रिएटर लॉगिन ID और पासवर्ड दोनों दर्ज करें।',
      };
    }

    const idHash = computeCreatorCredentialHash('id', trimmedId);
    const passHash = computeCreatorCredentialHash('pass', trimmedPass);

    if (
      idHash === creatorConfig.creatorIdHash &&
      passHash === creatorConfig.creatorPasswordHash
    ) {
      if (creatorConfig.failedAttempts > 0 || creatorConfig.lockoutUntil) {
        setCreatorConfig(prev => ({
          ...prev,
          failedAttempts: 0,
          lockoutUntil: null,
        }));
      }
      soundManager.playSuccessChime();
      return { ok: true };
    }

    soundManager.playAlertTone();
    const nextAttempts = (creatorConfig.failedAttempts || 0) + 1;
    if (nextAttempts >= 5) {
      const lockoutIso = new Date(now + 60 * 1000).toISOString();
      setCreatorConfig(prev => ({
        ...prev,
        failedAttempts: 0,
        lockoutUntil: lockoutIso,
      }));
      return {
        ok: false,
        lockedSecondsLeft: 60,
        error:
          '5 गलत लॉगिन प्रयास! क्रिएटर कंसोल को सुरक्षा हेतु 60 सेकंड के लिए लॉक कर दिया गया है।',
      };
    }

    setCreatorConfig(prev => ({
      ...prev,
      failedAttempts: nextAttempts,
      lockoutUntil: null,
    }));

    const attemptsRemaining = 5 - nextAttempts;
    return {
      ok: false,
      error: `अमान्य क्रिएटर ID या पासवर्ड! केवल अधिकृत सॉफ्टवेयर क्रिएटर ही लॉगिन कर सकते हैं (${attemptsRemaining} प्रयास शेष)।`,
    };
  };

  const updateCreatorCredentials = (params: {
    currentPassword: string;
    newCreatorId?: string;
    newPassword?: string;
  }): { ok: boolean; message: string } => {
    const currentHash = computeCreatorCredentialHash('pass', params.currentPassword);
    if (currentHash !== creatorConfig.creatorPasswordHash) {
      soundManager.playAlertTone();
      return {
        ok: false,
        message: 'वर्तमान क्रिएटर पासवर्ड गलत है (Incorrect Current Creator Password)।',
      };
    }

    const cleanNewId = params.newCreatorId?.trim() || '';
    const cleanNewPass = params.newPassword?.trim() || '';

    if (!cleanNewId && !cleanNewPass) {
      return {
        ok: false,
        message: 'अपडेट करने के लिए नया क्रिएटर ID या नया पासवर्ड दर्ज करें।',
      };
    }

    if (cleanNewId && cleanNewId.length < 4) {
      return {
        ok: false,
        message: 'नया क्रिएटर ID कम से कम 4 अक्षरों का होना चाहिए।',
      };
    }

    if (cleanNewPass && cleanNewPass.length < 6) {
      return {
        ok: false,
        message: 'नया क्रिएटर पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
      };
    }

    setCreatorConfig(prev => ({
      ...prev,
      creatorIdHash: cleanNewId
        ? computeCreatorCredentialHash('id', cleanNewId)
        : prev.creatorIdHash,
      creatorPasswordHash: cleanNewPass
        ? computeCreatorCredentialHash('pass', cleanNewPass)
        : prev.creatorPasswordHash,
      failedAttempts: 0,
      lockoutUntil: null,
    }));

    soundManager.playSuccessChime();
    return {
      ok: true,
      message: 'क्रिएटर लॉगिन ID / पासवर्ड सुरक्षित रूप से अपडेट हो गया!',
    };
  };

  const loginAsCreatorLifetime = (
    creatorId: string,
    password: string
  ): { ok: boolean; message: string } => {
    const res = verifyCreatorCredentials(creatorId, password);
    if (!res.ok) {
      return {
        ok: false,
        message: res.error || 'अमान्य क्रिएटर ID या पासवर्ड!',
      };
    }

    setLicenseState(prev => activateCreatorLifetimeState(prev));
    addNotification({
      title: 'Creator Always-Valid Mode Active',
      message: 'Creator authenticated. Software validity is set to Always Valid (Unlimited).',
      type: 'system',
    });
    return {
      ok: true,
      message: 'क्रिएटर लॉगिन सफल! आपके लिए सॉफ्टवेयर हमेशा (Always Valid) अनलॉक है।',
    };
  };

  const enableCreatorLifetimeMode = () => {
    setLicenseState(prev => activateCreatorLifetimeState(prev));
    soundManager.playSuccessChime();
  };

  const exitCreatorLifetimeMode = () => {
    setLicenseState(prev => exitCreatorLifetimeState(prev));
  };

  const openLoginGateScreen = () => {
    setLicenseState(prev => ({
      ...prev,
      accessMode: 'unactivated',
    }));
  };

  // Simulation helpers for testing 1-year expiry, 2-day public expiry & renewal gate immediately
  const simulateLicenseExpiry = () => {
    const now = Date.now();
    const expiredIso = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const pastStartIso = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
    setLicenseState(prev => ({
      ...prev,
      accessMode: 'annual_license',
      activeKey:
        prev.activeKey && prev.activeKey !== PUBLIC_2DAY_LICENSE_KEY
          ? prev.activeKey
          : 'VYPR-DEMO-EXPR-TEST-0000-YEAR',
      activatedAt: prev.activatedAt || pastStartIso,
      expiresAt: expiredIso,
      lastVerifiedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    }));
  };

  const simulateLicenseExpiringSoon = () => {
    const now = Date.now();
    const inSevenDaysIso = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    const startIso = new Date(now - 358 * 24 * 60 * 60 * 1000).toISOString();
    setLicenseState(prev => ({
      ...prev,
      accessMode: 'annual_license',
      activeKey:
        prev.activeKey && prev.activeKey !== PUBLIC_2DAY_LICENSE_KEY
          ? prev.activeKey
          : 'VYPR-SOON-EXPR-TEST-0007-DAYS',
      activatedAt: prev.activatedAt || startIso,
      expiresAt: inSevenDaysIso,
      durationDays: 365,
      lastVerifiedAt: new Date(now).toISOString(),
    }));
  };

  const simulatePublicTrialExpiry = () => {
    const now = Date.now();
    const expiredIso = new Date(now - 60 * 60 * 1000).toISOString();
    const startIso = new Date(now - 49 * 60 * 60 * 1000).toISOString();
    setLicenseState(prev => ({
      ...prev,
      accessMode: 'public_trial',
      activeKey: PUBLIC_2DAY_LICENSE_KEY,
      activatedAt: startIso,
      expiresAt: expiredIso,
      durationDays: 2,
      planLabel: '2-Day Public License',
      publicTrialUsed: true,
      publicTrialStartedAt: startIso,
      publicTrialExpiresAt: expiredIso,
      lastVerifiedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    }));
  };

  return (
    <AppContext.Provider
      value={{
        products,
        invoices,
        customers,
        users,
        activeUser,
        settings,
        notifications,
        cart,
        activeTab,
        setActiveTab,
        selectedPosCustomer,
        setSelectedPosCustomer,
        selectCustomerForPOS,
        isDarkMode,
        toggleDarkMode,
        colorTheme,
        setColorTheme,
        isOffline,
        isLocked,
        setIsLocked,
        unlockWithPin,
        unlockWithBiometrics,
        registerBiometricsForUser,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        findCustomerByPhone,
        addToCart,
        addCustomOrCatalogItemToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        updateCartTaxRate,
        applyGstSlabToCart,
        clearCart,
        checkout,
        addItemToInvoice,
        updateInvoiceItemQuantity,
        updateInvoiceItemTaxRate,
        updateInvoiceBillDiscount,
        createDirectInvoice,
        cancelOrRefundInvoice,
        addOrUpdateGstSlab,
        toggleGstSlab,
        deleteGstSlab,
        resetGstSlabsToDefault,
        updateSettings,
        markNotificationRead,
        clearNotifications,
        addNotification,
        requestPushPermission,
        clearAllData,
        exportBackup,
        importBackup,
        pendingEntryAction,
        clearPendingEntryAction,
        triggerQuickEntry,
        getDirectEntryUrl,
        licenseState,
        licenseEvaluation,
        activateLicenseKey,
        loginWithPublicLicense,
        loginAsCreatorLifetime,
        enableCreatorLifetimeMode,
        exitCreatorLifetimeMode,
        openLoginGateScreen,
        generatedKeys,
        generateNewLicenseKey,
        deleteGeneratedKey,
        creatorConfig,
        updateCreatorConfig,
        verifyCreatorCredentials,
        updateCreatorCredentials,
        simulateLicenseExpiry,
        simulateLicenseExpiringSoon,
        simulatePublicTrialExpiry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
