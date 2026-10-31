import { Product, Invoice, User, NotificationItem, StoreSettings, Customer } from '../types';

export const STORAGE_KEYS = {
  PRODUCTS: 'vyaparpos_products_v1',
  INVOICES: 'vyaparpos_invoices_v1',
  USERS: 'vyaparpos_users_v1',
  ACTIVE_USER: 'vyaparpos_active_user_v1',
  NOTIFICATIONS: 'vyaparpos_notifications_v1',
  SETTINGS: 'vyaparpos_settings_v1',
  THEME: 'vyaparpos_theme_v1',
  OFFLINE_QUEUE: 'vyaparpos_offline_queue_v1',
  CUSTOMERS: 'vyaparpos_customers_v1',
};

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Ramesh Kumar (Owner)',
    role: 'admin',
    pin: '1234',
    email: 'ramesh@vyaparmart.in',
    avatarColor: 'bg-emerald-600',
    hasBiometrics: true,
  },
  {
    id: 'usr-2',
    name: 'Pooja Sharma (Manager)',
    role: 'manager',
    pin: '2222',
    email: 'pooja@vyaparmart.in',
    avatarColor: 'bg-blue-600',
    hasBiometrics: false,
  },
  {
    id: 'usr-3',
    name: 'Amit Patel (Cashier)',
    role: 'cashier',
    pin: '3333',
    email: 'amit@vyaparmart.in',
    avatarColor: 'bg-amber-600',
    hasBiometrics: true,
  },
  {
    id: 'usr-4',
    name: 'Sunil Verma (Inventory)',
    role: 'inventory_clerk',
    pin: '4444',
    email: 'sunil@vyaparmart.in',
    avatarColor: 'bg-purple-600',
    hasBiometrics: false,
  },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'VyaparMart Super Store',
  tagline: 'Fresh Groceries, Spices & Daily Essentials',
  gstin: '07AAAAA0000A1Z5',
  phone: '+91 98765 43210',
  email: 'support@vyaparmart.in',
  address: 'Shop No. 14-16, Sector 18 Main Market, Noida, Uttar Pradesh 201301',
  upiVpa: 'vyaparmart@okhdfcbank',
  currencySymbol: '₹',
  social: {
    whatsapp: '919876543210',
    instagram: 'vyaparmart_official',
    facebook: 'vyaparmart.india',
    googleMaps: 'https://maps.google.com/?q=VyaparMart+Sector+18+Noida',
  },
  enablePushNotifications: true,
  soundEnabled: true,
  autoPrintReceipt: false,
  defaultTaxRate: 5,
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    barcode: '8901030383728',
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    nameHindi: 'आशीर्वाद आटा 5 किग्रा',
    category: 'Groceries & Staples',
    costPrice: 210,
    sellingPrice: 245,
    stock: 28,
    minStockAlert: 8,
    unit: 'pkt',
    taxRate: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    barcode: '8901725181222',
    name: 'Fortune Sunlite Refined Sunflower Oil 1L',
    nameHindi: 'फॉर्च्यून रिफाइंड तेल 1 लीटर',
    category: 'Cooking Essentials',
    costPrice: 125,
    sellingPrice: 148,
    stock: 42,
    minStockAlert: 10,
    unit: 'pkt',
    taxRate: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    barcode: '8901262010054',
    name: 'Amul Butter 500g Pasteurised',
    nameHindi: 'अमुल मक्खन 500 ग्राम',
    category: 'Dairy & Chilled',
    costPrice: 240,
    sellingPrice: 275,
    stock: 14,
    minStockAlert: 6,
    unit: 'box',
    taxRate: 12,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    barcode: '8901058852374',
    name: 'Maggi 2-Minute Masala Noodles 4-Pack',
    nameHindi: 'मैगी नूडल्स 4 पैक',
    category: 'Snacks & Instant Food',
    costPrice: 50,
    sellingPrice: 60,
    stock: 65,
    minStockAlert: 15,
    unit: 'pkt',
    taxRate: 12,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    barcode: '8901030825228',
    name: 'Tata Tea Gold Premium 250g',
    nameHindi: 'टाटा टी गोल्ड 250 ग्राम',
    category: 'Beverages',
    costPrice: 130,
    sellingPrice: 155,
    stock: 24,
    minStockAlert: 5,
    unit: 'pkt',
    taxRate: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    barcode: '8901719101038',
    name: 'Parle-G Gold Glucose Biscuits 1kg',
    nameHindi: 'पारले-जी बिस्कुट 1 किग्रा',
    category: 'Snacks & Instant Food',
    costPrice: 110,
    sellingPrice: 130,
    stock: 35,
    minStockAlert: 8,
    unit: 'pkt',
    taxRate: 18,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    barcode: '8901314010520',
    name: 'Tata Salt Vacuum Evaporated 1kg',
    nameHindi: 'टाटा नमक 1 किग्रा',
    category: 'Groceries & Staples',
    costPrice: 22,
    sellingPrice: 28,
    stock: 50,
    minStockAlert: 12,
    unit: 'pkt',
    taxRate: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-8',
    barcode: '8901030364956',
    name: 'Colgate Strong Teeth Toothpaste 200g',
    nameHindi: 'कोलगेट पेस्ट 200 ग्राम',
    category: 'Personal Care',
    costPrice: 95,
    sellingPrice: 118,
    stock: 3, // LOW STOCK alert
    minStockAlert: 5,
    unit: 'pcs',
    taxRate: 18,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-9',
    barcode: '8901396120150',
    name: 'Dettol Original Liquid Handwash Refill 750ml',
    nameHindi: 'डेटॉल हैंडवॉश 750 मिली',
    category: 'Personal Care',
    costPrice: 135,
    sellingPrice: 165,
    stock: 2, // CRITICAL LOW STOCK alert
    minStockAlert: 6,
    unit: 'pkt',
    taxRate: 18,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-10',
    barcode: '8902080000010',
    name: 'Organic Basmati Rice Royal Daawat 5kg',
    nameHindi: 'दावत बासमती चावल 5 किग्रा',
    category: 'Groceries & Staples',
    costPrice: 480,
    sellingPrice: 560,
    stock: 18,
    minStockAlert: 5,
    unit: 'pkt',
    taxRate: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-11',
    barcode: '8901725134105',
    name: 'Catch Super Garam Masala 100g',
    nameHindi: 'कैच गरम मसाला 100 ग्राम',
    category: 'Groceries & Staples',
    costPrice: 68,
    sellingPrice: 85,
    stock: 30,
    minStockAlert: 8,
    unit: 'box',
    taxRate: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-12',
    barcode: '8901491101901',
    name: 'Cadbury Dairy Milk Silk Chocolate 150g',
    nameHindi: 'डेयरी मिल्क सिल्क 150 ग्राम',
    category: 'Snacks & Instant Food',
    costPrice: 140,
    sellingPrice: 175,
    stock: 22,
    minStockAlert: 8,
    unit: 'pcs',
    taxRate: 18,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-13',
    barcode: '8906014410111',
    name: 'Coca-Cola Zero Sugar Can 330ml',
    nameHindi: 'कोका-कोला ज़ीरो 330 मिली',
    category: 'Beverages',
    costPrice: 32,
    sellingPrice: 40,
    stock: 48,
    minStockAlert: 12,
    unit: 'pcs',
    taxRate: 28,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-14',
    barcode: '8901030018590',
    name: 'Surf Excel Quick Wash Detergent Powder 1kg',
    nameHindi: 'सर्फ एक्सेल 1 किग्रा',
    category: 'Household & Cleaning',
    costPrice: 165,
    sellingPrice: 195,
    stock: 20,
    minStockAlert: 6,
    unit: 'pkt',
    taxRate: 18,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-15',
    barcode: '8901262060141',
    name: 'Amul Taaza Homogenised Toned Milk 1L',
    nameHindi: 'अमुल ताज़ा दूध 1 लीटर',
    category: 'Dairy & Chilled',
    costPrice: 64,
    sellingPrice: 72,
    stock: 19,
    minStockAlert: 8,
    unit: 'pkt',
    taxRate: 0,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Rajesh Verma',
    phone: '9811223344',
    email: 'rajesh.verma@gmail.com',
    address: 'B-42, Sector 15, Noida',
    gstin: '07AABCR1234F1Z9',
    loyaltyPoints: 120,
    notes: 'Regular customer, prefers delivery on weekends',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Anita Gupta',
    phone: '9822334455',
    email: 'anita.gupta@yahoo.co.in',
    address: 'Flat 302, Palm Heights, Indirapuram',
    loyaltyPoints: 85,
    notes: 'Likes organic pulses and Aashirvaad atta',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Vikas Malhotra',
    phone: '9833445566',
    email: 'vikas.m@rediffmail.com',
    address: 'Shop 5, Sector 18 Market, Noida',
    gstin: '07AABCM5678G2Z1',
    loyaltyPoints: 210,
    notes: 'Wholesale / B2B buyer for tea stall snacks',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Deepak Saxena',
    phone: '9844556677',
    email: 'deepak.saxena@outlook.com',
    address: 'C-104, Sector 62, Noida',
    loyaltyPoints: 45,
    notes: '',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-5',
    name: 'Meena Joshi',
    phone: '9855667788',
    email: 'meenajoshi@gmail.com',
    address: 'H-12, Sector 22, Noida',
    loyaltyPoints: 95,
    notes: 'Prefers Amul butter & fresh dairy items',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-6',
    name: 'Sanjay Sharma',
    phone: '9866778899',
    email: 'sanjay.sharma@gmail.com',
    address: 'House 88, Sector 12, Noida',
    loyaltyPoints: 60,
    notes: '',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-7',
    name: 'Neha Chawla',
    phone: '9877889900',
    email: 'neha.chawla@gmail.com',
    address: 'Tower A-601, Express Greens, Sector 44',
    loyaltyPoints: 150,
    notes: 'UPI payment always',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-8',
    name: 'Pankaj Agarwal',
    phone: '9899001122',
    email: 'pankaj.agarwal@hotmail.com',
    address: 'D-15, Sector 27, Noida',
    loyaltyPoints: 75,
    notes: '',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Generate 20 realistic past invoices for rich charts and monthly analytics
export function generateSeedInvoices(): Invoice[] {
  const invoices: Invoice[] = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const customerList = DEFAULT_CUSTOMERS;
  const paymentModes: ('cash' | 'upi' | 'card')[] = ['upi', 'cash', 'upi', 'card', 'upi', 'cash'];

  // Spread across days of this month and last 3 weeks
  for (let i = 24; i >= 1; i--) {
    const dayOffset = Math.floor((24 - i) * 1.1);
    const invoiceDate = new Date(currentYear, currentMonth, Math.max(1, now.getDate() - dayOffset), 10 + (i % 10), 15 + (i * 2) % 45);
    const cust = i % 5 === 0 ? null : customerList[i % customerList.length];
    const mode = paymentModes[i % paymentModes.length];

    // Pick 2-4 items
    const selectedProds = [
      DEFAULT_PRODUCTS[i % DEFAULT_PRODUCTS.length],
      DEFAULT_PRODUCTS[(i + 2) % DEFAULT_PRODUCTS.length],
      DEFAULT_PRODUCTS[(i + 4) % DEFAULT_PRODUCTS.length],
    ];

    const items = selectedProds.map(p => {
      const qty = 1 + (i % 3);
      const taxAmt = Math.round((p.sellingPrice * qty * p.taxRate) / 100);
      const tot = p.sellingPrice * qty + taxAmt;
      return {
        productId: p.id,
        name: p.name,
        barcode: p.barcode,
        unit: p.unit,
        quantity: qty,
        unitPrice: p.sellingPrice,
        taxRate: p.taxRate,
        taxAmount: taxAmt,
        discountAmount: 0,
        total: tot,
      };
    });

    const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
    const taxTotal = items.reduce((acc, it) => acc + it.taxAmount, 0);
    const discountTotal = (i % 5 === 0) ? 50 : 0;
    const grandTotal = Math.max(0, subtotal + taxTotal - discountTotal);

    invoices.push({
      id: `inv-seed-${i}`,
      invoiceNumber: `INV-${currentYear.toString().slice(-2)}${(currentMonth + 1).toString().padStart(2, '0')}-${(1000 + i).toString()}`,
      createdAt: invoiceDate.toISOString(),
      cashierId: 'usr-1',
      cashierName: 'Ramesh Kumar',
      customerId: cust ? cust.id : undefined,
      customerName: cust ? cust.name : 'Walk-in Customer',
      customerPhone: cust ? cust.phone : '',
      items,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      paymentMethod: mode,
      amountTendered: mode === 'cash' ? Math.ceil(grandTotal / 100) * 100 : grandTotal,
      changeDue: mode === 'cash' ? (Math.ceil(grandTotal / 100) * 100) - grandTotal : 0,
      status: 'paid',
      isOfflineCreated: false,
    });
  }

  return invoices;
}

export const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Critical Low Stock Alert',
    message: 'Dettol Original Liquid Handwash Refill 750ml has only 2 units remaining!',
    type: 'low_stock',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    read: false,
    relatedId: 'prod-9',
  },
  {
    id: 'notif-2',
    title: 'Low Stock Warning',
    message: 'Colgate Strong Teeth Toothpaste 200g has 3 units left (Threshold: 5).',
    type: 'low_stock',
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    read: false,
    relatedId: 'prod-8',
  },
  {
    id: 'notif-3',
    title: 'Sale Processed via UPI',
    message: 'Invoice INV-2609-1024 completed for ₹1,240.00 via UPI.',
    type: 'sale',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    read: true,
  },
];

export const StorageService = {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  },

  saveProducts(products: Product[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore
    }
  },

  getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const seed = generateSeedInvoices();
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(seed));
    return seed;
  },

  saveInvoices(invoices: Invoice[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch {
      // ignore
    }
  },

  getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  },

  saveUsers(users: User[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  },

  getActiveUser(): User {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return DEFAULT_USERS[0];
  },

  saveActiveUser(user: User) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    } catch {
      // ignore
    }
  },

  getSettings(): StoreSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: StoreSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  },

  getNotifications(): NotificationItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
    return DEFAULT_NOTIFICATIONS;
  },

  saveNotifications(notifications: NotificationItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  },

  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
    return DEFAULT_CUSTOMERS;
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
      version: '1.1',
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
      if (parsed.users && Array.isArray(parsed.users)) {
        this.saveUsers(parsed.users);
      }
      if (parsed.storeSettings) {
        this.saveSettings(parsed.storeSettings);
      }
      return true;
    } catch {
      return false;
    }
  },

  resetToDemoData() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
    const seedInvoices = generateSeedInvoices();
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(seedInvoices));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
};
