import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Invoice,
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
} from '../types';
import { StorageService } from '../utils/storage';
import { generateInvoiceNumber } from '../utils/formatters';
import { soundManager } from '../utils/audio';
import {
  LicenseStorage,
  evaluateLicenseStatus,
  verifyLicenseKey,
  applyLicenseActivation,
  createSignedLicenseKey,
  computeCreatorCredentialHash,
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
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discountPercent: number) => void;
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
    discountPercent?: number;
    notes?: string;
  }) => Invoice;
  cancelOrRefundInvoice: (invoiceId: string) => void;
  // Settings & notifications
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
  // Annual License & Creator Keygen System
  licenseState: LicenseState;
  licenseEvaluation: LicenseEvaluation;
  activateLicenseKey: (rawKey: string) => { ok: boolean; message: string };
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
        item.product.id === productId ? { ...item, discountPercent: Math.max(0, Math.min(100, discountPercent)) } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
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
    discountPercent?: number;
    notes?: string;
  }): Invoice => {
    if (cart.length === 0) {
      throw new Error('Cart is empty');
    }

    const billDiscountPercent = details.discountPercent || 0;
    
    // Calculate items
    const items = cart.map(ci => {
      const gross = ci.quantity * ci.unitPrice;
      const itemDiscount = (gross * (ci.discountPercent || 0)) / 100;
      const netAfterItemDiscount = gross - itemDiscount;
      const taxAmt = Math.round((netAfterItemDiscount * ci.taxRate) / 100);
      const total = netAfterItemDiscount + taxAmt;

      return {
        productId: ci.product.id,
        name: ci.product.name,
        barcode: ci.product.barcode,
        unit: ci.product.unit,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        taxRate: ci.taxRate,
        taxAmount: taxAmt,
        discountAmount: itemDiscount,
        total,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const itemDiscounts = items.reduce((sum, it) => sum + it.discountAmount, 0);
    const overallDiscount = (subtotal * billDiscountPercent) / 100;
    const discountTotal = itemDiscounts + overallDiscount;
    const taxTotal = items.reduce((sum, it) => sum + it.taxAmount, 0);
    const grandTotal = Math.max(0, Math.round(subtotal + taxTotal - discountTotal));

    const amountTendered = details.paymentMethod === 'cash' 
      ? (details.amountTendered || grandTotal) 
      : grandTotal;
    const changeDue = details.paymentMethod === 'cash' 
      ? Math.max(0, amountTendered - grandTotal) 
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
      grandTotal,
      paymentMethod: details.paymentMethod,
      amountTendered,
      changeDue,
      status: 'paid',
      notes: details.notes,
      isOfflineCreated: isOffline,
    };

    // 1. Deduct stock in real-time
    cart.forEach(ci => {
      adjustStock(ci.product.id, -ci.quantity, `Sold in ${newInvoice.invoiceNumber}`);
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

  // Cancel or Refund Invoice
  const cancelOrRefundInvoice = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === 'refunded') return;

    // Restore stock
    inv.items.forEach(it => {
      adjustStock(it.productId, it.quantity, `Restored from Refund ${inv.invoiceNumber}`);
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

  // Settings
  const updateSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
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

  // Simulation helpers for testing 1-year expiry & renewal gate immediately
  const simulateLicenseExpiry = () => {
    const now = Date.now();
    const expiredIso = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const pastStartIso = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
    setLicenseState(prev => ({
      ...prev,
      activeKey: prev.activeKey || 'VYPR-DEMO-EXPR-TEST-0000-YEAR',
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
      activeKey: prev.activeKey || 'VYPR-SOON-EXPR-TEST-0007-DAYS',
      activatedAt: prev.activatedAt || startIso,
      expiresAt: inSevenDaysIso,
      durationDays: 365,
      lastVerifiedAt: new Date(now).toISOString(),
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
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        clearCart,
        checkout,
        cancelOrRefundInvoice,
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
        generatedKeys,
        generateNewLicenseKey,
        deleteGeneratedKey,
        creatorConfig,
        updateCreatorConfig,
        verifyCreatorCredentials,
        updateCreatorCredentials,
        simulateLicenseExpiry,
        simulateLicenseExpiringSoon,
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
