import { and, desc, eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createUserSupabaseClient } from '../lib/supabase-admin.ts';
import { withRlsContext, type DbTransaction } from './index.ts';
import {
  customers,
  invoices,
  licenseRecords,
  notifications,
  products,
  staffUsers,
  storeSettings,
} from './schema.ts';
import type {
  ColorThemeId,
  CreatorConfig,
  Customer,
  GeneratedKeyRecord,
  Invoice,
  LicenseState,
  NotificationItem,
  Product,
  StoreSettings,
  User,
} from '../types/index.ts';

export interface StoreBootstrapPayload {
  hasCloudData: boolean;
  settings: StoreSettings | null;
  colorTheme: ColorThemeId | null;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  staffUsers: User[];
  notifications: NotificationItem[];
  licenseRecord: {
    licenseState: LicenseState;
    generatedKeys: GeneratedKeyRecord[];
    creatorConfig: CreatorConfig;
  } | null;
}

export interface SyncAllStorePayload {
  settings: StoreSettings;
  colorTheme: ColorThemeId;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  staffUsers: User[];
  notifications: NotificationItem[];
  licenseState: LicenseState;
  generatedKeys: GeneratedKeyRecord[];
  creatorConfig: CreatorConfig;
}

const VALID_COLOR_THEMES: ColorThemeId[] = [
  'peacock',
  'maharaja',
  'ruby',
  'kesariya',
  'emerald',
];

function normalizeColorTheme(raw: unknown): ColorThemeId {
  return VALID_COLOR_THEMES.includes(raw as ColorThemeId)
    ? (raw as ColorThemeId)
    : 'peacock';
}

function useDrizzlePg(): boolean {
  return Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER);
}

function getSupabaseForRequest(accessToken?: string): SupabaseClient {
  if (!accessToken) {
    throw new Error('Supabase session token is required.');
  }
  return createUserSupabaseClient(accessToken);
}

function mapSettingsRow(row: typeof storeSettings.$inferSelect): {
  settings: StoreSettings;
  colorTheme: ColorThemeId;
} {
  return {
    settings: {
      storeName: row.storeName,
      tagline: row.tagline,
      gstin: row.gstin,
      phone: row.phone,
      email: row.email,
      address: row.address,
      upiVpa: row.upiVpa,
      currencySymbol: row.currencySymbol,
      social: row.social,
      enablePushNotifications: row.enablePushNotifications,
      soundEnabled: row.soundEnabled,
      autoPrintReceipt: row.autoPrintReceipt,
      defaultTaxRate: row.defaultTaxRate,
      gstSlabs: row.gstSlabs,
      gstSupplyType: row.gstSupplyType === 'interstate' ? 'interstate' : 'intrastate',
      gstPriceMode: row.gstPriceMode === 'inclusive' ? 'inclusive' : 'exclusive',
    },
    colorTheme: normalizeColorTheme(row.colorTheme),
  };
}

function mapSupabaseSettingsRow(row: Record<string, unknown>): {
  settings: StoreSettings;
  colorTheme: ColorThemeId;
} {
  return {
    settings: {
      storeName: String(row.store_name || 'My Store'),
      tagline: String(row.tagline || ''),
      gstin: String(row.gstin || ''),
      phone: String(row.phone || ''),
      email: String(row.email || ''),
      address: String(row.address || ''),
      upiVpa: String(row.upi_vpa || ''),
      currencySymbol: String(row.currency_symbol || '₹'),
      social: (row.social as StoreSettings['social']) || {
        whatsapp: '',
        instagram: '',
        facebook: '',
        googleMaps: '',
      },
      enablePushNotifications: Boolean(row.enable_push_notifications),
      soundEnabled: row.sound_enabled !== false,
      autoPrintReceipt: Boolean(row.auto_print_receipt),
      defaultTaxRate: Number(row.default_tax_rate) || 5,
      gstSlabs: (row.gst_slabs as StoreSettings['gstSlabs']) || [],
      gstSupplyType: row.gst_supply_type === 'interstate' ? 'interstate' : 'intrastate',
      gstPriceMode: row.gst_price_mode === 'inclusive' ? 'inclusive' : 'exclusive',
    },
    colorTheme: normalizeColorTheme(row.color_theme),
  };
}

function mapProductRow(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    barcode: row.barcode,
    hsnCode: row.hsnCode ?? undefined,
    name: row.name,
    nameHindi: row.nameHindi ?? undefined,
    category: row.category,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    stock: row.stock,
    minStockAlert: row.minStockAlert,
    unit: (row.unit as Product['unit']) || 'pcs',
    taxRate: row.taxRate,
    imageUrl: row.imageUrl ?? undefined,
    updatedAt: row.updatedAt,
  };
}

function mapSupabaseProductRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    barcode: String(row.barcode || ''),
    hsnCode: row.hsn_code ? String(row.hsn_code) : undefined,
    name: String(row.name || ''),
    nameHindi: row.name_hindi ? String(row.name_hindi) : undefined,
    category: String(row.category || 'General'),
    costPrice: Number(row.cost_price) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    stock: Number(row.stock) || 0,
    minStockAlert: Number(row.min_stock_alert) || 5,
    unit: (String(row.unit || 'pcs') as Product['unit']) || 'pcs',
    taxRate: Number(row.tax_rate) || 0,
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapCustomerRow(row: typeof customers.$inferSelect): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    gstin: row.gstin ?? undefined,
    notes: row.notes ?? undefined,
    loyaltyPoints: row.loyaltyPoints,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSupabaseCustomerRow(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    phone: String(row.phone || ''),
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    gstin: row.gstin ? String(row.gstin) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    loyaltyPoints: Number(row.loyalty_points) || 0,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapInvoiceRow(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    createdAt: row.createdAt,
    cashierId: row.cashierId,
    cashierName: row.cashierName,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName ?? undefined,
    customerPhone: row.customerPhone ?? undefined,
    customerAddress: row.customerAddress ?? undefined,
    customerGstin: row.customerGstin ?? undefined,
    items: row.items,
    subtotal: row.subtotal,
    taxTotal: row.taxTotal,
    discountTotal: row.discountTotal,
    billDiscountMode:
      row.billDiscountMode === 'percent' || row.billDiscountMode === 'amount'
        ? row.billDiscountMode
        : undefined,
    billDiscountValue: row.billDiscountValue ?? undefined,
    grandTotal: row.grandTotal,
    gstSupplyType:
      row.gstSupplyType === 'interstate' || row.gstSupplyType === 'intrastate'
        ? row.gstSupplyType
        : undefined,
    gstPriceMode:
      row.gstPriceMode === 'inclusive' || row.gstPriceMode === 'exclusive'
        ? row.gstPriceMode
        : undefined,
    paymentMethod: (row.paymentMethod as Invoice['paymentMethod']) || 'cash',
    amountTendered: row.amountTendered ?? undefined,
    changeDue: row.changeDue ?? undefined,
    status: (row.status as Invoice['status']) || 'paid',
    notes: row.notes ?? undefined,
    isOfflineCreated: row.isOfflineCreated,
  };
}

function mapSupabaseInvoiceRow(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    cashierId: String(row.cashier_id || ''),
    cashierName: String(row.cashier_name || ''),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    customerName: row.customer_name ? String(row.customer_name) : undefined,
    customerPhone: row.customer_phone ? String(row.customer_phone) : undefined,
    customerAddress: row.customer_address ? String(row.customer_address) : undefined,
    customerGstin: row.customer_gstin ? String(row.customer_gstin) : undefined,
    items: (row.items as Invoice['items']) || [],
    subtotal: Number(row.subtotal) || 0,
    taxTotal: Number(row.tax_total) || 0,
    discountTotal: Number(row.discount_total) || 0,
    billDiscountMode:
      row.bill_discount_mode === 'percent' || row.bill_discount_mode === 'amount'
        ? row.bill_discount_mode
        : undefined,
    billDiscountValue:
      row.bill_discount_value !== null && row.bill_discount_value !== undefined
        ? Number(row.bill_discount_value)
        : undefined,
    grandTotal: Number(row.grand_total) || 0,
    gstSupplyType:
      row.gst_supply_type === 'interstate' || row.gst_supply_type === 'intrastate'
        ? row.gst_supply_type
        : undefined,
    gstPriceMode:
      row.gst_price_mode === 'inclusive' || row.gst_price_mode === 'exclusive'
        ? row.gst_price_mode
        : undefined,
    paymentMethod: (String(row.payment_method || 'cash') as Invoice['paymentMethod']) || 'cash',
    amountTendered:
      row.amount_tendered !== null && row.amount_tendered !== undefined
        ? Number(row.amount_tendered)
        : undefined,
    changeDue:
      row.change_due !== null && row.change_due !== undefined
        ? Number(row.change_due)
        : undefined,
    status: (String(row.status || 'paid') as Invoice['status']) || 'paid',
    notes: row.notes ? String(row.notes) : undefined,
    isOfflineCreated: Boolean(row.is_offline_created),
  };
}

function mapStaffRow(row: typeof staffUsers.$inferSelect): User {
  return {
    id: row.id,
    name: row.name,
    role: (row.role as User['role']) || 'cashier',
    pin: row.pin,
    email: row.email,
    avatarColor: row.avatarColor,
    hasBiometrics: row.hasBiometrics,
  };
}

function mapSupabaseStaffRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    role: (String(row.role || 'cashier') as User['role']) || 'cashier',
    pin: String(row.pin || '1234'),
    email: String(row.email || ''),
    avatarColor: String(row.avatar_color || 'bg-emerald-600'),
    hasBiometrics: Boolean(row.has_biometrics),
  };
}

function mapNotificationRow(row: typeof notifications.$inferSelect): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: (row.type as NotificationItem['type']) || 'system',
    timestamp: row.timestamp,
    read: row.read,
    relatedId: row.relatedId ?? undefined,
  };
}

function mapSupabaseNotificationRow(row: Record<string, unknown>): NotificationItem {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    message: String(row.message || ''),
    type: (String(row.type || 'system') as NotificationItem['type']) || 'system',
    timestamp: String(row.timestamp || new Date().toISOString()),
    read: Boolean(row.read),
    relatedId: row.related_id ? String(row.related_id) : undefined,
  };
}

function buildSupabaseSettingsRecord(
  ownerUid: string,
  settings: StoreSettings,
  colorTheme: ColorThemeId
) {
  return {
    owner_uid: ownerUid,
    store_name: settings.storeName,
    tagline: settings.tagline || '',
    gstin: settings.gstin || '',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    upi_vpa: settings.upiVpa || '',
    currency_symbol: settings.currencySymbol || '₹',
    social: settings.social,
    enable_push_notifications: Boolean(settings.enablePushNotifications),
    sound_enabled: settings.soundEnabled !== false,
    auto_print_receipt: Boolean(settings.autoPrintReceipt),
    default_tax_rate: Number(settings.defaultTaxRate) || 5,
    gst_slabs: settings.gstSlabs,
    gst_supply_type: settings.gstSupplyType === 'interstate' ? 'interstate' : 'intrastate',
    gst_price_mode: settings.gstPriceMode === 'inclusive' ? 'inclusive' : 'exclusive',
    color_theme: colorTheme || 'peacock',
    updated_at: new Date().toISOString(),
  };
}

function buildSupabaseProductRecord(ownerUid: string, product: Product) {
  return {
    id: product.id,
    owner_uid: ownerUid,
    barcode: product.barcode || '',
    hsn_code: product.hsnCode ?? null,
    name: product.name,
    name_hindi: product.nameHindi ?? null,
    category: product.category || 'General',
    cost_price: Number(product.costPrice) || 0,
    selling_price: Number(product.sellingPrice) || 0,
    stock: Number(product.stock) || 0,
    min_stock_alert: Number(product.minStockAlert) || 5,
    unit: product.unit || 'pcs',
    tax_rate: Number(product.taxRate) || 0,
    image_url: product.imageUrl ?? null,
    updated_at: product.updatedAt || new Date().toISOString(),
  };
}

function buildSupabaseCustomerRecord(ownerUid: string, customer: Customer) {
  return {
    id: customer.id,
    owner_uid: ownerUid,
    name: customer.name,
    phone: customer.phone || '',
    email: customer.email ?? null,
    address: customer.address ?? null,
    gstin: customer.gstin ?? null,
    notes: customer.notes ?? null,
    loyalty_points: Number(customer.loyaltyPoints) || 0,
    created_at: customer.createdAt || new Date().toISOString(),
    updated_at: customer.updatedAt || new Date().toISOString(),
  };
}

function buildSupabaseInvoiceRecord(ownerUid: string, invoice: Invoice) {
  return {
    id: invoice.id,
    owner_uid: ownerUid,
    invoice_number: invoice.invoiceNumber,
    created_at: invoice.createdAt || new Date().toISOString(),
    cashier_id: invoice.cashierId,
    cashier_name: invoice.cashierName,
    customer_id: invoice.customerId ?? null,
    customer_name: invoice.customerName ?? null,
    customer_phone: invoice.customerPhone ?? null,
    customer_address: invoice.customerAddress ?? null,
    customer_gstin: invoice.customerGstin ?? null,
    items: invoice.items,
    subtotal: Number(invoice.subtotal) || 0,
    tax_total: Number(invoice.taxTotal) || 0,
    discount_total: Number(invoice.discountTotal) || 0,
    bill_discount_mode: invoice.billDiscountMode ?? null,
    bill_discount_value: invoice.billDiscountValue ?? null,
    grand_total: Number(invoice.grandTotal) || 0,
    gst_supply_type: invoice.gstSupplyType ?? null,
    gst_price_mode: invoice.gstPriceMode ?? null,
    payment_method: invoice.paymentMethod || 'cash',
    amount_tendered: invoice.amountTendered ?? null,
    change_due: invoice.changeDue ?? null,
    status: invoice.status || 'paid',
    notes: invoice.notes ?? null,
    is_offline_created: Boolean(invoice.isOfflineCreated),
  };
}

function buildSupabaseStaffRecord(ownerUid: string, user: User) {
  return {
    id: user.id,
    owner_uid: ownerUid,
    name: user.name,
    role: user.role || 'cashier',
    pin: user.pin || '1234',
    email: user.email || '',
    avatar_color: user.avatarColor || 'bg-emerald-600',
    has_biometrics: Boolean(user.hasBiometrics),
  };
}

function buildSupabaseNotificationRecord(ownerUid: string, notif: NotificationItem) {
  return {
    id: notif.id,
    owner_uid: ownerUid,
    title: notif.title,
    message: notif.message,
    type: notif.type || 'system',
    timestamp: notif.timestamp || new Date().toISOString(),
    read: Boolean(notif.read),
    related_id: notif.relatedId ?? null,
  };
}

async function upsertSettingsTx(
  tx: DbTransaction,
  ownerUid: string,
  settings: StoreSettings,
  colorTheme: ColorThemeId
) {
  const now = new Date();
  await tx
    .insert(storeSettings)
    .values({
      ownerUid,
      storeName: settings.storeName,
      tagline: settings.tagline || '',
      gstin: settings.gstin || '',
      phone: settings.phone || '',
      email: settings.email || '',
      address: settings.address || '',
      upiVpa: settings.upiVpa || '',
      currencySymbol: settings.currencySymbol || '₹',
      social: settings.social,
      enablePushNotifications: Boolean(settings.enablePushNotifications),
      soundEnabled: settings.soundEnabled !== false,
      autoPrintReceipt: Boolean(settings.autoPrintReceipt),
      defaultTaxRate: Number(settings.defaultTaxRate) || 5,
      gstSlabs: settings.gstSlabs,
      gstSupplyType: settings.gstSupplyType === 'interstate' ? 'interstate' : 'intrastate',
      gstPriceMode: settings.gstPriceMode === 'inclusive' ? 'inclusive' : 'exclusive',
      colorTheme: colorTheme || 'peacock',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: storeSettings.ownerUid,
      set: {
        storeName: settings.storeName,
        tagline: settings.tagline || '',
        gstin: settings.gstin || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        upiVpa: settings.upiVpa || '',
        currencySymbol: settings.currencySymbol || '₹',
        social: settings.social,
        enablePushNotifications: Boolean(settings.enablePushNotifications),
        soundEnabled: settings.soundEnabled !== false,
        autoPrintReceipt: Boolean(settings.autoPrintReceipt),
        defaultTaxRate: Number(settings.defaultTaxRate) || 5,
        gstSlabs: settings.gstSlabs,
        gstSupplyType: settings.gstSupplyType === 'interstate' ? 'interstate' : 'intrastate',
        gstPriceMode: settings.gstPriceMode === 'inclusive' ? 'inclusive' : 'exclusive',
        colorTheme: colorTheme || 'peacock',
        updatedAt: now,
      },
    });
}

async function upsertProductTx(tx: DbTransaction, ownerUid: string, product: Product) {
  await tx
    .insert(products)
    .values({
      id: product.id,
      ownerUid,
      barcode: product.barcode || '',
      hsnCode: product.hsnCode ?? null,
      name: product.name,
      nameHindi: product.nameHindi ?? null,
      category: product.category || 'General',
      costPrice: Number(product.costPrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
      stock: Number(product.stock) || 0,
      minStockAlert: Number(product.minStockAlert) || 5,
      unit: product.unit || 'pcs',
      taxRate: Number(product.taxRate) || 0,
      imageUrl: product.imageUrl ?? null,
      updatedAt: product.updatedAt || new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [products.ownerUid, products.id],
      set: {
        barcode: product.barcode || '',
        hsnCode: product.hsnCode ?? null,
        name: product.name,
        nameHindi: product.nameHindi ?? null,
        category: product.category || 'General',
        costPrice: Number(product.costPrice) || 0,
        sellingPrice: Number(product.sellingPrice) || 0,
        stock: Number(product.stock) || 0,
        minStockAlert: Number(product.minStockAlert) || 5,
        unit: product.unit || 'pcs',
        taxRate: Number(product.taxRate) || 0,
        imageUrl: product.imageUrl ?? null,
        updatedAt: product.updatedAt || new Date().toISOString(),
      },
    });
}

async function upsertCustomerTx(tx: DbTransaction, ownerUid: string, customer: Customer) {
  await tx
    .insert(customers)
    .values({
      id: customer.id,
      ownerUid,
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email ?? null,
      address: customer.address ?? null,
      gstin: customer.gstin ?? null,
      notes: customer.notes ?? null,
      loyaltyPoints: Number(customer.loyaltyPoints) || 0,
      createdAt: customer.createdAt || new Date().toISOString(),
      updatedAt: customer.updatedAt || new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [customers.ownerUid, customers.id],
      set: {
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email ?? null,
        address: customer.address ?? null,
        gstin: customer.gstin ?? null,
        notes: customer.notes ?? null,
        loyaltyPoints: Number(customer.loyaltyPoints) || 0,
        updatedAt: customer.updatedAt || new Date().toISOString(),
      },
    });
}

async function upsertInvoiceTx(tx: DbTransaction, ownerUid: string, invoice: Invoice) {
  await tx
    .insert(invoices)
    .values({
      id: invoice.id,
      ownerUid,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt || new Date().toISOString(),
      cashierId: invoice.cashierId,
      cashierName: invoice.cashierName,
      customerId: invoice.customerId ?? null,
      customerName: invoice.customerName ?? null,
      customerPhone: invoice.customerPhone ?? null,
      customerAddress: invoice.customerAddress ?? null,
      customerGstin: invoice.customerGstin ?? null,
      items: invoice.items,
      subtotal: Number(invoice.subtotal) || 0,
      taxTotal: Number(invoice.taxTotal) || 0,
      discountTotal: Number(invoice.discountTotal) || 0,
      billDiscountMode: invoice.billDiscountMode ?? null,
      billDiscountValue: invoice.billDiscountValue ?? null,
      grandTotal: Number(invoice.grandTotal) || 0,
      gstSupplyType: invoice.gstSupplyType ?? null,
      gstPriceMode: invoice.gstPriceMode ?? null,
      paymentMethod: invoice.paymentMethod || 'cash',
      amountTendered: invoice.amountTendered ?? null,
      changeDue: invoice.changeDue ?? null,
      status: invoice.status || 'paid',
      notes: invoice.notes ?? null,
      isOfflineCreated: Boolean(invoice.isOfflineCreated),
    })
    .onConflictDoUpdate({
      target: [invoices.ownerUid, invoices.id],
      set: {
        invoiceNumber: invoice.invoiceNumber,
        cashierId: invoice.cashierId,
        cashierName: invoice.cashierName,
        customerId: invoice.customerId ?? null,
        customerName: invoice.customerName ?? null,
        customerPhone: invoice.customerPhone ?? null,
        customerAddress: invoice.customerAddress ?? null,
        customerGstin: invoice.customerGstin ?? null,
        items: invoice.items,
        subtotal: Number(invoice.subtotal) || 0,
        taxTotal: Number(invoice.taxTotal) || 0,
        discountTotal: Number(invoice.discountTotal) || 0,
        billDiscountMode: invoice.billDiscountMode ?? null,
        billDiscountValue: invoice.billDiscountValue ?? null,
        grandTotal: Number(invoice.grandTotal) || 0,
        gstSupplyType: invoice.gstSupplyType ?? null,
        gstPriceMode: invoice.gstPriceMode ?? null,
        paymentMethod: invoice.paymentMethod || 'cash',
        amountTendered: invoice.amountTendered ?? null,
        changeDue: invoice.changeDue ?? null,
        status: invoice.status || 'paid',
        notes: invoice.notes ?? null,
        isOfflineCreated: Boolean(invoice.isOfflineCreated),
      },
    });
}

async function upsertStaffUserTx(tx: DbTransaction, ownerUid: string, user: User) {
  await tx
    .insert(staffUsers)
    .values({
      id: user.id,
      ownerUid,
      name: user.name,
      role: user.role || 'cashier',
      pin: user.pin || '1234',
      email: user.email || '',
      avatarColor: user.avatarColor || 'bg-emerald-600',
      hasBiometrics: Boolean(user.hasBiometrics),
    })
    .onConflictDoUpdate({
      target: [staffUsers.ownerUid, staffUsers.id],
      set: {
        name: user.name,
        role: user.role || 'cashier',
        pin: user.pin || '1234',
        email: user.email || '',
        avatarColor: user.avatarColor || 'bg-emerald-600',
        hasBiometrics: Boolean(user.hasBiometrics),
      },
    });
}

async function upsertNotificationTx(
  tx: DbTransaction,
  ownerUid: string,
  notif: NotificationItem
) {
  await tx
    .insert(notifications)
    .values({
      id: notif.id,
      ownerUid,
      title: notif.title,
      message: notif.message,
      type: notif.type || 'system',
      timestamp: notif.timestamp || new Date().toISOString(),
      read: Boolean(notif.read),
      relatedId: notif.relatedId ?? null,
    })
    .onConflictDoUpdate({
      target: [notifications.ownerUid, notifications.id],
      set: {
        title: notif.title,
        message: notif.message,
        type: notif.type || 'system',
        read: Boolean(notif.read),
        relatedId: notif.relatedId ?? null,
      },
    });
}

async function upsertLicenseRecordTx(
  tx: DbTransaction,
  ownerUid: string,
  payload: {
    licenseState: LicenseState;
    generatedKeys: GeneratedKeyRecord[];
    creatorConfig: CreatorConfig;
  }
) {
  const now = new Date();
  await tx
    .insert(licenseRecords)
    .values({
      ownerUid,
      licenseState: payload.licenseState,
      generatedKeys: payload.generatedKeys,
      creatorConfig: payload.creatorConfig,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: licenseRecords.ownerUid,
      set: {
        licenseState: payload.licenseState,
        generatedKeys: payload.generatedKeys,
        creatorConfig: payload.creatorConfig,
        updatedAt: now,
      },
    });
}

export async function getBootstrapData(
  ownerUid: string,
  accessToken?: string
): Promise<StoreBootstrapPayload> {
  try {
    if (useDrizzlePg()) {
      return await withRlsContext(ownerUid, async tx => {
        const [
          settingsRows,
          productRows,
          customerRows,
          invoiceRows,
          staffRows,
          notificationRows,
          licenseRows,
        ] = await Promise.all([
          tx.select().from(storeSettings).where(eq(storeSettings.ownerUid, ownerUid)),
          tx
            .select()
            .from(products)
            .where(eq(products.ownerUid, ownerUid))
            .orderBy(desc(products.pk)),
          tx
            .select()
            .from(customers)
            .where(eq(customers.ownerUid, ownerUid))
            .orderBy(desc(customers.pk)),
          tx
            .select()
            .from(invoices)
            .where(eq(invoices.ownerUid, ownerUid))
            .orderBy(desc(invoices.pk)),
          tx.select().from(staffUsers).where(eq(staffUsers.ownerUid, ownerUid)),
          tx
            .select()
            .from(notifications)
            .where(eq(notifications.ownerUid, ownerUid))
            .orderBy(desc(notifications.pk))
            .limit(100),
          tx.select().from(licenseRecords).where(eq(licenseRecords.ownerUid, ownerUid)),
        ]);

        const mappedSettings = settingsRows[0] ? mapSettingsRow(settingsRows[0]) : null;
        const mappedLicense = licenseRows[0]
          ? {
              licenseState: licenseRows[0].licenseState,
              generatedKeys: licenseRows[0].generatedKeys,
              creatorConfig: licenseRows[0].creatorConfig,
            }
          : null;

        const hasCloudData =
          Boolean(mappedSettings) ||
          productRows.length > 0 ||
          customerRows.length > 0 ||
          invoiceRows.length > 0 ||
          staffRows.length > 0 ||
          notificationRows.length > 0 ||
          Boolean(mappedLicense);

        return {
          hasCloudData,
          settings: mappedSettings?.settings ?? null,
          colorTheme: mappedSettings?.colorTheme ?? null,
          products: productRows.map(mapProductRow),
          customers: customerRows.map(mapCustomerRow),
          invoices: invoiceRows.map(mapInvoiceRow),
          staffUsers: staffRows.map(mapStaffRow),
          notifications: notificationRows.map(mapNotificationRow),
          licenseRecord: mappedLicense,
        };
      });
    }

    const supabase = getSupabaseForRequest(accessToken);
    const [
      settingsRes,
      productsRes,
      customersRes,
      invoicesRes,
      staffRes,
      notifRes,
      licenseRes,
    ] = await Promise.all([
      supabase.from('store_settings').select('*').eq('owner_uid', ownerUid).maybeSingle(),
      supabase
        .from('products')
        .select('*')
        .eq('owner_uid', ownerUid)
        .order('pk', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('owner_uid', ownerUid)
        .order('pk', { ascending: false }),
      supabase
        .from('invoices')
        .select('*')
        .eq('owner_uid', ownerUid)
        .order('pk', { ascending: false }),
      supabase.from('staff_users').select('*').eq('owner_uid', ownerUid),
      supabase
        .from('notifications')
        .select('*')
        .eq('owner_uid', ownerUid)
        .order('pk', { ascending: false })
        .limit(100),
      supabase.from('license_records').select('*').eq('owner_uid', ownerUid).maybeSingle(),
    ]);

    for (const r of [
      settingsRes,
      productsRes,
      customersRes,
      invoicesRes,
      staffRes,
      notifRes,
      licenseRes,
    ]) {
      if (r.error) throw r.error;
    }

    const mappedSettings = settingsRes.data
      ? mapSupabaseSettingsRow(settingsRes.data as Record<string, unknown>)
      : null;
    const mappedLicense = licenseRes.data
      ? {
          licenseState: (licenseRes.data as Record<string, unknown>).license_state as LicenseState,
          generatedKeys:
            ((licenseRes.data as Record<string, unknown>).generated_keys as GeneratedKeyRecord[]) ||
            [],
          creatorConfig: (licenseRes.data as Record<string, unknown>)
            .creator_config as CreatorConfig,
        }
      : null;

    const productRows = (productsRes.data || []) as Record<string, unknown>[];
    const customerRows = (customersRes.data || []) as Record<string, unknown>[];
    const invoiceRows = (invoicesRes.data || []) as Record<string, unknown>[];
    const staffRows = (staffRes.data || []) as Record<string, unknown>[];
    const notificationRows = (notifRes.data || []) as Record<string, unknown>[];

    const hasCloudData =
      Boolean(mappedSettings) ||
      productRows.length > 0 ||
      customerRows.length > 0 ||
      invoiceRows.length > 0 ||
      staffRows.length > 0 ||
      notificationRows.length > 0 ||
      Boolean(mappedLicense);

    return {
      hasCloudData,
      settings: mappedSettings?.settings ?? null,
      colorTheme: mappedSettings?.colorTheme ?? null,
      products: productRows.map(mapSupabaseProductRow),
      customers: customerRows.map(mapSupabaseCustomerRow),
      invoices: invoiceRows.map(mapSupabaseInvoiceRow),
      staffUsers: staffRows.map(mapSupabaseStaffRow),
      notifications: notificationRows.map(mapSupabaseNotificationRow),
      licenseRecord: mappedLicense,
    };
  } catch (error) {
    console.error('Database query failed in getBootstrapData:', error);
    throw new Error('Failed to load store data from database.', { cause: error });
  }
}

export async function syncAllStoreData(
  ownerUid: string,
  payload: SyncAllStorePayload,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertSettingsTx(tx, ownerUid, payload.settings, payload.colorTheme);
        for (const p of payload.products) await upsertProductTx(tx, ownerUid, p);
        for (const c of payload.customers) await upsertCustomerTx(tx, ownerUid, c);
        for (const inv of payload.invoices) await upsertInvoiceTx(tx, ownerUid, inv);
        for (const u of payload.staffUsers) await upsertStaffUserTx(tx, ownerUid, u);
        for (const n of payload.notifications.slice(0, 100)) {
          await upsertNotificationTx(tx, ownerUid, n);
        }
        await upsertLicenseRecordTx(tx, ownerUid, {
          licenseState: payload.licenseState,
          generatedKeys: payload.generatedKeys,
          creatorConfig: payload.creatorConfig,
        });
      });
      return;
    }

    const supabase = getSupabaseForRequest(accessToken);
    const settingsRes = await supabase
      .from('store_settings')
      .upsert(buildSupabaseSettingsRecord(ownerUid, payload.settings, payload.colorTheme), {
        onConflict: 'owner_uid',
      });
    if (settingsRes.error) throw settingsRes.error;

    if (payload.products.length > 0) {
      const res = await supabase
        .from('products')
        .upsert(
          payload.products.map(p => buildSupabaseProductRecord(ownerUid, p)),
          { onConflict: 'owner_uid,id' }
        );
      if (res.error) throw res.error;
    }

    if (payload.customers.length > 0) {
      const res = await supabase
        .from('customers')
        .upsert(
          payload.customers.map(c => buildSupabaseCustomerRecord(ownerUid, c)),
          { onConflict: 'owner_uid,id' }
        );
      if (res.error) throw res.error;
    }

    if (payload.invoices.length > 0) {
      const res = await supabase
        .from('invoices')
        .upsert(
          payload.invoices.map(inv => buildSupabaseInvoiceRecord(ownerUid, inv)),
          { onConflict: 'owner_uid,id' }
        );
      if (res.error) throw res.error;
    }

    if (payload.staffUsers.length > 0) {
      const res = await supabase
        .from('staff_users')
        .upsert(
          payload.staffUsers.map(u => buildSupabaseStaffRecord(ownerUid, u)),
          { onConflict: 'owner_uid,id' }
        );
      if (res.error) throw res.error;
    }

    if (payload.notifications.length > 0) {
      const res = await supabase
        .from('notifications')
        .upsert(
          payload.notifications
            .slice(0, 100)
            .map(n => buildSupabaseNotificationRecord(ownerUid, n)),
          { onConflict: 'owner_uid,id' }
        );
      if (res.error) throw res.error;
    }

    const licRes = await supabase.from('license_records').upsert(
      {
        owner_uid: ownerUid,
        license_state: payload.licenseState,
        generated_keys: payload.generatedKeys,
        creator_config: payload.creatorConfig,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_uid' }
    );
    if (licRes.error) throw licRes.error;
  } catch (error) {
    console.error('Database query failed in syncAllStoreData:', error);
    throw new Error('Failed to synchronize store data to database.', { cause: error });
  }
}

export async function saveSettings(
  ownerUid: string,
  settings: StoreSettings,
  colorTheme: ColorThemeId,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertSettingsTx(tx, ownerUid, settings, colorTheme);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('store_settings')
      .upsert(buildSupabaseSettingsRecord(ownerUid, settings, colorTheme), {
        onConflict: 'owner_uid',
      });
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in saveSettings:', error);
    throw new Error('Failed to save store settings.', { cause: error });
  }
}

export async function upsertProduct(
  ownerUid: string,
  product: Product,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertProductTx(tx, ownerUid, product);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('products')
      .upsert(buildSupabaseProductRecord(ownerUid, product), { onConflict: 'owner_uid,id' });
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in upsertProduct:', error);
    throw new Error('Failed to save product.', { cause: error });
  }
}

export async function deleteProduct(
  ownerUid: string,
  productId: string,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await tx
          .delete(products)
          .where(and(eq(products.ownerUid, ownerUid), eq(products.id, productId)));
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('owner_uid', ownerUid)
      .eq('id', productId);
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in deleteProduct:', error);
    throw new Error('Failed to delete product.', { cause: error });
  }
}

export async function upsertCustomer(
  ownerUid: string,
  customer: Customer,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertCustomerTx(tx, ownerUid, customer);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('customers')
      .upsert(buildSupabaseCustomerRecord(ownerUid, customer), { onConflict: 'owner_uid,id' });
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in upsertCustomer:', error);
    throw new Error('Failed to save customer.', { cause: error });
  }
}

export async function deleteCustomer(
  ownerUid: string,
  customerId: string,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await tx
          .delete(customers)
          .where(and(eq(customers.ownerUid, ownerUid), eq(customers.id, customerId)));
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('owner_uid', ownerUid)
      .eq('id', customerId);
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in deleteCustomer:', error);
    throw new Error('Failed to delete customer.', { cause: error });
  }
}

export async function upsertInvoice(
  ownerUid: string,
  invoice: Invoice,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertInvoiceTx(tx, ownerUid, invoice);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('invoices')
      .upsert(buildSupabaseInvoiceRecord(ownerUid, invoice), { onConflict: 'owner_uid,id' });
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in upsertInvoice:', error);
    throw new Error('Failed to save invoice.', { cause: error });
  }
}

export async function upsertStaffUser(
  ownerUid: string,
  user: User,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertStaffUserTx(tx, ownerUid, user);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('staff_users')
      .upsert(buildSupabaseStaffRecord(ownerUid, user), { onConflict: 'owner_uid,id' });
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in upsertStaffUser:', error);
    throw new Error('Failed to save staff member.', { cause: error });
  }
}

export async function deleteStaffUser(
  ownerUid: string,
  userId: string,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await tx
          .delete(staffUsers)
          .where(and(eq(staffUsers.ownerUid, ownerUid), eq(staffUsers.id, userId)));
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('staff_users')
      .delete()
      .eq('owner_uid', ownerUid)
      .eq('id', userId);
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in deleteStaffUser:', error);
    throw new Error('Failed to delete staff member.', { cause: error });
  }
}

export async function upsertNotification(
  ownerUid: string,
  notif: NotificationItem,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertNotificationTx(tx, ownerUid, notif);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('notifications')
      .upsert(buildSupabaseNotificationRecord(ownerUid, notif), { onConflict: 'owner_uid,id' });
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in upsertNotification:', error);
    throw new Error('Failed to save notification.', { cause: error });
  }
}

export async function markNotificationReadInDb(
  ownerUid: string,
  notificationId: string,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await tx
          .update(notifications)
          .set({ read: true })
          .where(
            and(
              eq(notifications.ownerUid, ownerUid),
              eq(notifications.id, notificationId)
            )
          );
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('owner_uid', ownerUid)
      .eq('id', notificationId);
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in markNotificationReadInDb:', error);
    throw new Error('Failed to update notification.', { cause: error });
  }
}

export async function clearNotificationsInDb(
  ownerUid: string,
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await tx.delete(notifications).where(eq(notifications.ownerUid, ownerUid));
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('owner_uid', ownerUid);
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in clearNotificationsInDb:', error);
    throw new Error('Failed to clear notifications.', { cause: error });
  }
}

export async function saveLicenseRecord(
  ownerUid: string,
  payload: {
    licenseState: LicenseState;
    generatedKeys: GeneratedKeyRecord[];
    creatorConfig: CreatorConfig;
  },
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await upsertLicenseRecordTx(tx, ownerUid, payload);
      });
      return;
    }
    const supabase = getSupabaseForRequest(accessToken);
    const { error } = await supabase.from('license_records').upsert(
      {
        owner_uid: ownerUid,
        license_state: payload.licenseState,
        generated_keys: payload.generatedKeys,
        creator_config: payload.creatorConfig,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_uid' }
    );
    if (error) throw error;
  } catch (error) {
    console.error('Database query failed in saveLicenseRecord:', error);
    throw new Error('Failed to save license record.', { cause: error });
  }
}

export async function clearAllOwnerStoreData(
  ownerUid: string,
  defaults: {
    settings: StoreSettings;
    colorTheme: ColorThemeId;
    staffUsers: User[];
  },
  accessToken?: string
): Promise<void> {
  try {
    if (useDrizzlePg()) {
      await withRlsContext(ownerUid, async tx => {
        await Promise.all([
          tx.delete(products).where(eq(products.ownerUid, ownerUid)),
          tx.delete(customers).where(eq(customers.ownerUid, ownerUid)),
          tx.delete(invoices).where(eq(invoices.ownerUid, ownerUid)),
          tx.delete(notifications).where(eq(notifications.ownerUid, ownerUid)),
          tx.delete(staffUsers).where(eq(staffUsers.ownerUid, ownerUid)),
        ]);

        await upsertSettingsTx(tx, ownerUid, defaults.settings, defaults.colorTheme);
        for (const u of defaults.staffUsers) {
          await upsertStaffUserTx(tx, ownerUid, u);
        }
      });
      return;
    }

    const supabase = getSupabaseForRequest(accessToken);
    const delResults = await Promise.all([
      supabase.from('products').delete().eq('owner_uid', ownerUid),
      supabase.from('customers').delete().eq('owner_uid', ownerUid),
      supabase.from('invoices').delete().eq('owner_uid', ownerUid),
      supabase.from('notifications').delete().eq('owner_uid', ownerUid),
      supabase.from('staff_users').delete().eq('owner_uid', ownerUid),
    ]);
    for (const r of delResults) {
      if (r.error) throw r.error;
    }

    const settingsRes = await supabase
      .from('store_settings')
      .upsert(buildSupabaseSettingsRecord(ownerUid, defaults.settings, defaults.colorTheme), {
        onConflict: 'owner_uid',
      });
    if (settingsRes.error) throw settingsRes.error;

    if (defaults.staffUsers.length > 0) {
      const staffRes = await supabase
        .from('staff_users')
        .upsert(
          defaults.staffUsers.map(u => buildSupabaseStaffRecord(ownerUid, u)),
          { onConflict: 'owner_uid,id' }
        );
      if (staffRes.error) throw staffRes.error;
    }
  } catch (error) {
    console.error('Database query failed in clearAllOwnerStoreData:', error);
    throw new Error('Failed to clear store data.', { cause: error });
  }
}
