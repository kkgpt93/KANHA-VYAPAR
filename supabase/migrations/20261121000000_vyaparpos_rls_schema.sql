-- =============================================================================
-- VyaparPOS Supabase PostgreSQL Schema & Row-Level Security (RLS) Migration
-- Run this SQL in Supabase Dashboard -> SQL Editor (or via `supabase db push`)
-- =============================================================================

-- 1. Users Profile Table (Linked 1:1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Store Settings Table (Per-Owner Store Configuration, GST Slabs & Color Theme)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id SERIAL PRIMARY KEY,
  owner_uid TEXT NOT NULL UNIQUE REFERENCES public.users(uid) ON DELETE CASCADE,
  store_name TEXT NOT NULL DEFAULT 'My Store',
  tagline TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  upi_vpa TEXT NOT NULL DEFAULT '',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  social JSONB NOT NULL DEFAULT '{"whatsapp":"","instagram":"","facebook":"","googleMaps":""}'::jsonb,
  enable_push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_print_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  default_tax_rate DOUBLE PRECISION NOT NULL DEFAULT 5,
  gst_slabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  gst_supply_type TEXT NOT NULL DEFAULT 'intrastate',
  gst_price_mode TEXT NOT NULL DEFAULT 'exclusive',
  color_theme TEXT NOT NULL DEFAULT 'peacock',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Products Inventory Table
CREATE TABLE IF NOT EXISTS public.products (
  pk SERIAL PRIMARY KEY,
  id TEXT NOT NULL,
  owner_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  barcode TEXT NOT NULL DEFAULT '',
  hsn_code TEXT,
  name TEXT NOT NULL,
  name_hindi TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  cost_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  selling_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_stock_alert DOUBLE PRECISION NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  tax_rate DOUBLE PRECISION NOT NULL DEFAULT 5,
  image_url TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS products_owner_id_uidx
  ON public.products (owner_uid, id);

-- 4. Customers Directory Table
CREATE TABLE IF NOT EXISTS public.customers (
  pk SERIAL PRIMARY KEY,
  id TEXT NOT NULL,
  owner_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_owner_id_uidx
  ON public.customers (owner_uid, id);

-- 5. Invoices & Billing Ledger Table
CREATE TABLE IF NOT EXISTS public.invoices (
  pk SERIAL PRIMARY KEY,
  id TEXT NOT NULL,
  owner_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  created_at TEXT NOT NULL,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_gstin TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  discount_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  bill_discount_mode TEXT,
  bill_discount_value DOUBLE PRECISION,
  grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  gst_supply_type TEXT,
  gst_price_mode TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount_tendered DOUBLE PRECISION,
  change_due DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'paid',
  notes TEXT,
  is_offline_created BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_owner_id_uidx
  ON public.invoices (owner_uid, id);

-- 6. Store Staff / Operators Table (POS Terminal Cashiers, Managers & Clerks)
CREATE TABLE IF NOT EXISTS public.staff_users (
  pk SERIAL PRIMARY KEY,
  id TEXT NOT NULL,
  owner_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  pin TEXT NOT NULL DEFAULT '1234',
  email TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT 'bg-emerald-600',
  has_biometrics BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_users_owner_id_uidx
  ON public.staff_users (owner_uid, id);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  pk SERIAL PRIMARY KEY,
  id TEXT NOT NULL,
  owner_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  timestamp TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  related_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_owner_id_uidx
  ON public.notifications (owner_uid, id);

-- 8. License Records Table (Annual License State, Keygen Registry, Creator Contact Config)
CREATE TABLE IF NOT EXISTS public.license_records (
  id SERIAL PRIMARY KEY,
  owner_uid TEXT NOT NULL UNIQUE REFERENCES public.users(uid) ON DELETE CASCADE,
  license_state JSONB NOT NULL,
  generated_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  creator_config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Enable PostgreSQL Row-Level Security (RLS) on All Tables
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_records ENABLE ROW LEVEL SECURITY;

-- Helper expression: resolves authenticated Supabase Auth UID or session setting
CREATE OR REPLACE FUNCTION public.current_actor_uid()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_user_uid', true), ''),
    auth.uid()::text
  );
$$;

-- RLS Policies (Strict Owner Isolation)
DROP POLICY IF EXISTS "users_self_rls" ON public.users;
CREATE POLICY "users_self_rls"
  ON public.users
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (uid = public.current_actor_uid())
  WITH CHECK (uid = public.current_actor_uid());

DROP POLICY IF EXISTS "store_settings_owner_rls" ON public.store_settings;
CREATE POLICY "store_settings_owner_rls"
  ON public.store_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

DROP POLICY IF EXISTS "products_owner_rls" ON public.products;
CREATE POLICY "products_owner_rls"
  ON public.products
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

DROP POLICY IF EXISTS "customers_owner_rls" ON public.customers;
CREATE POLICY "customers_owner_rls"
  ON public.customers
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

DROP POLICY IF EXISTS "invoices_owner_rls" ON public.invoices;
CREATE POLICY "invoices_owner_rls"
  ON public.invoices
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

DROP POLICY IF EXISTS "staff_users_owner_rls" ON public.staff_users;
CREATE POLICY "staff_users_owner_rls"
  ON public.staff_users
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

DROP POLICY IF EXISTS "notifications_owner_rls" ON public.notifications;
CREATE POLICY "notifications_owner_rls"
  ON public.notifications
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

DROP POLICY IF EXISTS "license_records_owner_rls" ON public.license_records;
CREATE POLICY "license_records_owner_rls"
  ON public.license_records
  AS PERMISSIVE
  FOR ALL
  TO authenticated, public
  USING (owner_uid = public.current_actor_uid())
  WITH CHECK (owner_uid = public.current_actor_uid());

-- =============================================================================
-- Auto-Sync Supabase Auth Users into public.users
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (uid, email, display_name, updated_at)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, NEW.id::text || '@users.vyaparpos.local'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NOW()
  )
  ON CONFLICT (uid) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_supabase_user();
