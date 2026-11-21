import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  CreatorConfig,
  GeneratedKeyRecord,
  GstSlabConfig,
  InvoiceItem,
  LicenseState,
  StoreSettings,
} from '../types/index.ts';

/**
 * 1. Users Table (Linked to Supabase Auth UID)
 * Enforces PostgreSQL Row-Level Security (RLS) so each authenticated user can only
 * access and update their own user row via current_setting('app.current_user_uid', true) or auth.uid().
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    pgPolicy('users_self_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.uid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.uid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 2. Store Settings Table (Per-Owner Store Configuration & GST Slabs)
 */
export const storeSettings = pgTable(
  'store_settings',
  {
    id: serial('id').primaryKey(),
    ownerUid: text('owner_uid')
      .notNull()
      .unique()
      .references(() => users.uid, { onDelete: 'cascade' }),
    storeName: text('store_name').notNull().default('My Store'),
    tagline: text('tagline').notNull().default(''),
    gstin: text('gstin').notNull().default(''),
    phone: text('phone').notNull().default(''),
    email: text('email').notNull().default(''),
    address: text('address').notNull().default(''),
    upiVpa: text('upi_vpa').notNull().default(''),
    currencySymbol: text('currency_symbol').notNull().default('₹'),
    social: jsonb('social').$type<StoreSettings['social']>().notNull(),
    enablePushNotifications: boolean('enable_push_notifications').notNull().default(false),
    soundEnabled: boolean('sound_enabled').notNull().default(true),
    autoPrintReceipt: boolean('auto_print_receipt').notNull().default(false),
    defaultTaxRate: doublePrecision('default_tax_rate').notNull().default(5),
    gstSlabs: jsonb('gst_slabs').$type<GstSlabConfig[]>().notNull(),
    gstSupplyType: text('gst_supply_type').notNull().default('intrastate'),
    gstPriceMode: text('gst_price_mode').notNull().default('exclusive'),
    colorTheme: text('color_theme').notNull().default('peacock'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    pgPolicy('store_settings_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 3. Products Inventory Table
 */
export const products = pgTable(
  'products',
  {
    pk: serial('pk').primaryKey(),
    id: text('id').notNull(),
    ownerUid: text('owner_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    barcode: text('barcode').notNull().default(''),
    hsnCode: text('hsn_code'),
    name: text('name').notNull(),
    nameHindi: text('name_hindi'),
    category: text('category').notNull().default('General'),
    costPrice: doublePrecision('cost_price').notNull().default(0),
    sellingPrice: doublePrecision('selling_price').notNull().default(0),
    stock: doublePrecision('stock').notNull().default(0),
    minStockAlert: doublePrecision('min_stock_alert').notNull().default(5),
    unit: text('unit').notNull().default('pcs'),
    taxRate: doublePrecision('tax_rate').notNull().default(5),
    imageUrl: text('image_url'),
    updatedAt: text('updated_at').notNull(),
  },
  table => [
    uniqueIndex('products_owner_id_uidx').on(table.ownerUid, table.id),
    pgPolicy('products_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 4. Customers Directory Table
 */
export const customers = pgTable(
  'customers',
  {
    pk: serial('pk').primaryKey(),
    id: text('id').notNull(),
    ownerUid: text('owner_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    address: text('address'),
    gstin: text('gstin'),
    notes: text('notes'),
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [
    uniqueIndex('customers_owner_id_uidx').on(table.ownerUid, table.id),
    pgPolicy('customers_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 5. Invoices & Billing Ledger Table
 */
export const invoices = pgTable(
  'invoices',
  {
    pk: serial('pk').primaryKey(),
    id: text('id').notNull(),
    ownerUid: text('owner_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    invoiceNumber: text('invoice_number').notNull(),
    createdAt: text('created_at').notNull(),
    cashierId: text('cashier_id').notNull(),
    cashierName: text('cashier_name').notNull(),
    customerId: text('customer_id'),
    customerName: text('customer_name'),
    customerPhone: text('customer_phone'),
    customerAddress: text('customer_address'),
    customerGstin: text('customer_gstin'),
    items: jsonb('items').$type<InvoiceItem[]>().notNull(),
    subtotal: doublePrecision('subtotal').notNull().default(0),
    taxTotal: doublePrecision('tax_total').notNull().default(0),
    discountTotal: doublePrecision('discount_total').notNull().default(0),
    billDiscountMode: text('bill_discount_mode'),
    billDiscountValue: doublePrecision('bill_discount_value'),
    grandTotal: doublePrecision('grand_total').notNull().default(0),
    gstSupplyType: text('gst_supply_type'),
    gstPriceMode: text('gst_price_mode'),
    paymentMethod: text('payment_method').notNull().default('cash'),
    amountTendered: doublePrecision('amount_tendered'),
    changeDue: doublePrecision('change_due'),
    status: text('status').notNull().default('paid'),
    notes: text('notes'),
    isOfflineCreated: boolean('is_offline_created').notNull().default(false),
  },
  table => [
    uniqueIndex('invoices_owner_id_uidx').on(table.ownerUid, table.id),
    pgPolicy('invoices_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 6. Store Staff / Operators Table (POS Terminal Cashiers, Managers & Clerks)
 */
export const staffUsers = pgTable(
  'staff_users',
  {
    pk: serial('pk').primaryKey(),
    id: text('id').notNull(),
    ownerUid: text('owner_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role').notNull().default('cashier'),
    pin: text('pin').notNull().default('1234'),
    email: text('email').notNull().default(''),
    avatarColor: text('avatar_color').notNull().default('bg-emerald-600'),
    hasBiometrics: boolean('has_biometrics').notNull().default(false),
  },
  table => [
    uniqueIndex('staff_users_owner_id_uidx').on(table.ownerUid, table.id),
    pgPolicy('staff_users_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 7. Notifications Table
 */
export const notifications = pgTable(
  'notifications',
  {
    pk: serial('pk').primaryKey(),
    id: text('id').notNull(),
    ownerUid: text('owner_uid')
      .notNull()
      .references(() => users.uid, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    type: text('type').notNull().default('system'),
    timestamp: text('timestamp').notNull(),
    read: boolean('read').notNull().default(false),
    relatedId: text('related_id'),
  },
  table => [
    uniqueIndex('notifications_owner_id_uidx').on(table.ownerUid, table.id),
    pgPolicy('notifications_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

/**
 * 8. License Records Table (Annual License State, Keygen Registry, Creator Contact Config)
 */
export const licenseRecords = pgTable(
  'license_records',
  {
    id: serial('id').primaryKey(),
    ownerUid: text('owner_uid')
      .notNull()
      .unique()
      .references(() => users.uid, { onDelete: 'cascade' }),
    licenseState: jsonb('license_state').$type<LicenseState>().notNull(),
    generatedKeys: jsonb('generated_keys').$type<GeneratedKeyRecord[]>().notNull(),
    creatorConfig: jsonb('creator_config').$type<CreatorConfig>().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => [
    pgPolicy('license_records_owner_rls', {
      as: 'permissive',
      for: 'all',
      to: 'public',
      using: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
      withCheck: sql`${table.ownerUid} = current_setting('app.current_user_uid', true)`,
    }),
  ]
).enableRLS();

// Drizzle Relational Definitions
export const usersRelations = relations(users, ({ one, many }) => ({
  storeSettings: one(storeSettings, {
    fields: [users.uid],
    references: [storeSettings.ownerUid],
  }),
  licenseRecord: one(licenseRecords, {
    fields: [users.uid],
    references: [licenseRecords.ownerUid],
  }),
  products: many(products),
  customers: many(customers),
  invoices: many(invoices),
  staffUsers: many(staffUsers),
  notifications: many(notifications),
}));

export const productsRelations = relations(products, ({ one }) => ({
  owner: one(users, {
    fields: [products.ownerUid],
    references: [users.uid],
  }),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  owner: one(users, {
    fields: [customers.ownerUid],
    references: [users.uid],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  owner: one(users, {
    fields: [invoices.ownerUid],
    references: [users.uid],
  }),
}));

export const staffUsersRelations = relations(staffUsers, ({ one }) => ({
  owner: one(users, {
    fields: [staffUsers.ownerUid],
    references: [users.uid],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  owner: one(users, {
    fields: [notifications.ownerUid],
    references: [users.uid],
  }),
}));
