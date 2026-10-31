export type RoleType = 'admin' | 'manager' | 'cashier' | 'inventory_clerk';

export interface User {
  id: string;
  name: string;
  role: RoleType;
  pin: string;
  email: string;
  avatarColor: string;
  hasBiometrics?: boolean;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  nameHindi?: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  unit: 'pcs' | 'kg' | 'g' | 'ltr' | 'ml' | 'pkt' | 'box';
  taxRate: number; // e.g. 0, 5, 12, 18
  imageUrl?: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
  loyaltyPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  barcode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeDue?: number;
  status: 'paid' | 'refunded' | 'cancelled';
  notes?: string;
  isOfflineCreated?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'sale' | 'low_stock' | 'system' | 'sync';
  timestamp: string;
  read: boolean;
  relatedId?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  upiVpa: string;
  currencySymbol: string;
  social: {
    whatsapp: string;
    instagram: string;
    facebook: string;
    googleMaps: string;
  };
  enablePushNotifications: boolean;
  soundEnabled: boolean;
  autoPrintReceipt: boolean;
  defaultTaxRate: number;
}

export type ActiveTab =
  | 'pos'
  | 'setup'
  | 'inventory'
  | 'customers'
  | 'invoices'
  | 'analytics'
  | 'users'
  | 'license'
  | 'settings';

export type QuickEntryAction =
  | 'setup-hub'
  | 'store-profile'
  | 'add-product'
  | 'add-customer'
  | 'add-staff'
  | 'new-bill';

export interface LicenseHistoryRecord {
  id: string;
  licenseKey: string;
  activatedAt: string;
  expiresAt: string;
  durationDays: number;
  planLabel: string;
  activatedBy: string;
  isDeviceBound: boolean;
}

export interface LicenseState {
  installationId: string;
  activeKey: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  durationDays: number;
  planLabel: string;
  usedKeys: string[];
  history: LicenseHistoryRecord[];
  lastVerifiedAt: string;
}

export interface GeneratedKeyRecord {
  id: string;
  licenseKey: string;
  clientName: string;
  clientPhone?: string;
  targetInstallationId?: string;
  durationDays: number;
  planLabel: string;
  createdAt: string;
  notes?: string;
}

export interface CreatorConfig {
  creatorIdHash: string;
  creatorPasswordHash: string;
  vendorName: string;
  vendorPhone: string;
  failedAttempts: number;
  lockoutUntil: string | null;
}

export type LicenseStatusType =
  | 'unactivated'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'clock_tampered';

export interface LicenseEvaluation {
  status: LicenseStatusType;
  isLockedByLicense: boolean;
  daysRemaining: number;
  totalDays: number;
  progressPercent: number;
  expiresAt: string | null;
  activatedAt: string | null;
}

