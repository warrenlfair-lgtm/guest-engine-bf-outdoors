-- BF Outdoors clone of Guest Engine
-- Consolidated setup for a brand-new empty Supabase project.
-- Source of truth: current stable application code and existing setup files.
--
-- Notes:
--   - No production business data is inserted.
--   - No Phase 2A multi-company changes are included.
--   - This file is intended to create the schema and safe default catalog data
--     needed for the current stable app to run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Core app tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_profile (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  company_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  logo_url TEXT,
  admin_pin TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_pin TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.company_profile
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on company_profile" ON public.company_profile;
CREATE POLICY "Allow all operations on company_profile" ON public.company_profile
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO public.company_profile (id, company_name, tagline, admin_pin)
SELECT 1, 'Guest Ready™', 'Powered by Guest Engine™', '1234'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.company_profile
  WHERE id = 1
);

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name TEXT NOT NULL,
  client_name TEXT,
  billing_company_name TEXT,
  billing_email TEXT,
  billing_address TEXT,
  billing_account_reference TEXT,
  address TEXT,
  ical_url TEXT,
  safetyculture_checklist_url TEXT,
  standard_service_day TEXT NOT NULL DEFAULT 'Wednesday',
  coverage_days INTEGER NOT NULL DEFAULT 1,
  coverage_rule TEXT NOT NULL DEFAULT 'both',
  default_off_cycle_charge NUMERIC NOT NULL DEFAULT 65,
  default_cleaning_rate NUMERIC NOT NULL DEFAULT 0,
  billing_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  billing_tax_rate NUMERIC NOT NULL DEFAULT 0,
  payment_terms TEXT NOT NULL DEFAULT 'Net 15',
  invoice_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT properties_coverage_rule_check
    CHECK (coverage_rule IN ('none', 'before', 'after', 'both')),
  CONSTRAINT properties_standard_day_check
    CHECK (standard_service_day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'))
);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_name TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_account_reference TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS ical_url TEXT,
  ADD COLUMN IF NOT EXISTS safetyculture_checklist_url TEXT,
  ADD COLUMN IF NOT EXISTS standard_service_day TEXT,
  ADD COLUMN IF NOT EXISTS coverage_days INTEGER,
  ADD COLUMN IF NOT EXISTS coverage_rule TEXT,
  ADD COLUMN IF NOT EXISTS default_off_cycle_charge NUMERIC,
  ADD COLUMN IF NOT EXISTS default_cleaning_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS billing_taxable BOOLEAN,
  ADD COLUMN IF NOT EXISTS billing_tax_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS invoice_notes TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.properties
  ALTER COLUMN standard_service_day SET DEFAULT 'Wednesday',
  ALTER COLUMN coverage_days SET DEFAULT 1,
  ALTER COLUMN coverage_rule SET DEFAULT 'both',
  ALTER COLUMN default_off_cycle_charge SET DEFAULT 65,
  ALTER COLUMN default_cleaning_rate SET DEFAULT 0,
  ALTER COLUMN billing_taxable SET DEFAULT TRUE,
  ALTER COLUMN billing_tax_rate SET DEFAULT 0,
  ALTER COLUMN payment_terms SET DEFAULT 'Net 15',
  ALTER COLUMN active SET DEFAULT TRUE,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_client_name ON public.properties(client_name);
CREATE INDEX IF NOT EXISTS idx_properties_ical_url ON public.properties(ical_url);
CREATE INDEX IF NOT EXISTS idx_properties_safetyculture_checklist_url ON public.properties(safetyculture_checklist_url);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  client_name TEXT,
  billing_email TEXT,
  billing_address TEXT,
  period_start DATE,
  period_end DATE,
  invoice_date DATE,
  due_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'finalized', 'sent', 'paid', 'void'))
);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC,
  ADD COLUMN IF NOT EXISTS tax NUMERIC,
  ADD COLUMN IF NOT EXISTS total NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.invoices
  ALTER COLUMN subtotal SET DEFAULT 0,
  ALTER COLUMN tax SET DEFAULT 0,
  ALTER COLUMN total SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON public.invoices(period_start, period_end);

CREATE TABLE IF NOT EXISTS public.cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  property_name TEXT,
  service_date DATE NOT NULL,
  scheduled_date DATE,
  suggested_date DATE,
  check_in_date DATE,
  service_type TEXT NOT NULL DEFAULT 'Manual',
  technician TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  guest_ready BOOLEAN NOT NULL DEFAULT FALSE,
  off_cycle BOOLEAN NOT NULL DEFAULT FALSE,
  charge NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  manually_modified BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  invoiced BOOLEAN NOT NULL DEFAULT FALSE,
  invoiced_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoiced_at TIMESTAMPTZ,
  source_type TEXT,
  source_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cleaning_tasks_status_check CHECK (status IN ('Scheduled', 'Completed', 'Cancelled'))
);

ALTER TABLE public.cleaning_tasks
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS property_name TEXT,
  ADD COLUMN IF NOT EXISTS service_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS suggested_date DATE,
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS technician TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS guest_ready BOOLEAN,
  ADD COLUMN IF NOT EXISTS off_cycle BOOLEAN,
  ADD COLUMN IF NOT EXISTS charge NUMERIC,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS manually_modified BOOLEAN,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN,
  ADD COLUMN IF NOT EXISTS invoiced_invoice_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_key TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.cleaning_tasks
  ALTER COLUMN service_type SET DEFAULT 'Manual',
  ALTER COLUMN status SET DEFAULT 'Scheduled',
  ALTER COLUMN guest_ready SET DEFAULT FALSE,
  ALTER COLUMN off_cycle SET DEFAULT FALSE,
  ALTER COLUMN charge SET DEFAULT 0,
  ALTER COLUMN manually_modified SET DEFAULT FALSE,
  ALTER COLUMN invoiced SET DEFAULT FALSE,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_property_id ON public.cleaning_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_service_date ON public.cleaning_tasks(service_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON public.cleaning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_check_in_date ON public.cleaning_tasks(check_in_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_service_type ON public.cleaning_tasks(service_type);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_source_key ON public.cleaning_tasks(source_key);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_invoice_id ON public.cleaning_tasks(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_invoiced_invoice_id ON public.cleaning_tasks(invoiced_invoice_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_completed_at ON public.cleaning_tasks(completed_at);

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_name TEXT,
  check_in DATE NOT NULL,
  check_out DATE,
  reservation_uid TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS check_in DATE,
  ADD COLUMN IF NOT EXISTS check_out DATE,
  ADD COLUMN IF NOT EXISTS reservation_uid TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE public.reservations
  ALTER COLUMN imported_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reservations_property_id ON public.reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON public.reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON public.reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_source ON public.reservations(source);

CREATE TABLE IF NOT EXISTS public.chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_unit TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  billable_rate_per_unit NUMERIC NOT NULL DEFAULT 0,
  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chemicals
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS default_unit TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN,
  ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS billable_rate_per_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.chemicals
  ALTER COLUMN active SET DEFAULT TRUE,
  ALTER COLUMN cost_per_unit SET DEFAULT 0,
  ALTER COLUMN billable_rate_per_unit SET DEFAULT 0,
  ALTER COLUMN is_billable SET DEFAULT TRUE,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_chemicals_name_unique ON public.chemicals (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_chemicals_active ON public.chemicals(active);
CREATE INDEX IF NOT EXISTS idx_chemicals_name ON public.chemicals(LOWER(name));

ALTER TABLE public.chemicals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on chemicals" ON public.chemicals;
CREATE POLICY "Allow all operations on chemicals" ON public.chemicals
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO public.chemicals (name, default_unit, active, cost_per_unit, billable_rate_per_unit, is_billable)
VALUES
  ('Liquid Chlorine', 'gallons', true, 0, 0, true),
  ('Chlorine Tablets', 'tablets', true, 0, 0, true),
  ('pH Up', 'pounds', true, 0, 0, true),
  ('pH Down', 'pounds', true, 0, 0, true),
  ('Alkalinity Up', 'pounds', true, 0, 0, true),
  ('Alkalinity Down', 'pounds', true, 0, 0, true),
  ('Stabilizer / CYA', 'pounds', true, 0, 0, true),
  ('Calcium Hardness Increaser', 'pounds', true, 0, 0, true),
  ('Algaecide', 'quarts', true, 0, 0, true),
  ('Clarifier', 'quarts', true, 0, 0, true),
  ('Phosphate Remover', 'quarts', true, 0, 0, true),
  ('Salt', 'bags', true, 0, 0, true),
  ('Other', NULL, true, 0, 0, true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.operations_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  notes TEXT,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.operations_reminders
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.operations_reminders
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.operations_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on operations_reminders" ON public.operations_reminders;
CREATE POLICY "Allow all operations on operations_reminders" ON public.operations_reminders
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_operations_reminders_property_status ON public.operations_reminders(property_id, status);
CREATE INDEX IF NOT EXISTS idx_operations_reminders_due_date ON public.operations_reminders(due_date);

CREATE TABLE IF NOT EXISTS public.chemical_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.cleaning_tasks(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  chemical_id UUID REFERENCES public.chemicals(id) ON DELETE SET NULL,
  property_name TEXT,
  service_date DATE,
  chemical_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  invoiced BOOLEAN NOT NULL DEFAULT FALSE,
  invoiced_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chemical_usage
  ADD COLUMN IF NOT EXISTS task_id UUID,
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS chemical_id UUID,
  ADD COLUMN IF NOT EXISTS property_name TEXT,
  ADD COLUMN IF NOT EXISTS service_date DATE,
  ADD COLUMN IF NOT EXISTS chemical_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS invoiced BOOLEAN,
  ADD COLUMN IF NOT EXISTS invoiced_invoice_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.chemical_usage
  ALTER COLUMN invoiced SET DEFAULT FALSE,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.chemical_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on chemical_usage" ON public.chemical_usage;
CREATE POLICY "Allow all operations on chemical_usage" ON public.chemical_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chemical_usage_task_id ON public.chemical_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_property_service_date ON public.chemical_usage(property_id, service_date);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_chemical_id ON public.chemical_usage(chemical_id);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_invoiced ON public.chemical_usage(invoiced);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_invoice_id ON public.chemical_usage(invoice_id);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_invoiced_invoice_id ON public.chemical_usage(invoiced_invoice_id);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.cleaning_tasks(id) ON DELETE SET NULL,
  chemical_usage_id UUID REFERENCES public.chemical_usage(id) ON DELETE SET NULL,
  description TEXT,
  service_date DATE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  rate NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  item_source TEXT,
  item_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoice_items_item_source_check CHECK (item_source IS NULL OR item_source IN ('manual', 'task', 'chemical'))
);

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS task_id UUID,
  ADD COLUMN IF NOT EXISTS chemical_usage_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS service_date DATE,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS rate NUMERIC,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS item_source TEXT,
  ADD COLUMN IF NOT EXISTS item_type TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE public.invoice_items
  ALTER COLUMN quantity SET DEFAULT 0,
  ALTER COLUMN rate SET DEFAULT 0,
  ALTER COLUMN amount SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_task_id ON public.invoice_items(task_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_chemical_usage_id ON public.invoice_items(chemical_usage_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_source ON public.invoice_items(item_source);

-- ---------------------------------------------------------------------------
-- Storage for company logos
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

DROP POLICY IF EXISTS "Company logos are publicly readable" ON storage.objects;
CREATE POLICY "Company logos are publicly readable" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Allow logo uploads" ON storage.objects;
CREATE POLICY "Allow logo uploads" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Allow logo updates" ON storage.objects;
CREATE POLICY "Allow logo updates" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Allow logo deletes" ON storage.objects;
CREATE POLICY "Allow logo deletes" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'company-logos');

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification queries
-- ---------------------------------------------------------------------------

-- Table presence
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'company_profile',
    'properties',
    'invoices',
    'cleaning_tasks',
    'reservations',
    'chemicals',
    'operations_reminders',
    'chemical_usage',
    'invoice_items'
  )
ORDER BY table_name;

-- Column inventory for the core app tables
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'company_profile',
    'properties',
    'invoices',
    'cleaning_tasks',
    'reservations',
    'chemicals',
    'operations_reminders',
    'chemical_usage',
    'invoice_items'
  )
ORDER BY table_name, ordinal_position;

-- Row counts for an empty clone (chemicals is intentionally seeded)
SELECT 'company_profile' AS table_name, COUNT(*) AS row_count FROM public.company_profile
UNION ALL
SELECT 'properties', COUNT(*) FROM public.properties
UNION ALL
SELECT 'invoices', COUNT(*) FROM public.invoices
UNION ALL
SELECT 'cleaning_tasks', COUNT(*) FROM public.cleaning_tasks
UNION ALL
SELECT 'reservations', COUNT(*) FROM public.reservations
UNION ALL
SELECT 'chemicals', COUNT(*) FROM public.chemicals
UNION ALL
SELECT 'operations_reminders', COUNT(*) FROM public.operations_reminders
UNION ALL
SELECT 'chemical_usage', COUNT(*) FROM public.chemical_usage
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM public.invoice_items;

-- RLS and policy check for tables that require open access in the stable app
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('company_profile', 'chemicals', 'chemical_usage', 'operations_reminders')
ORDER BY tablename, policyname;

-- Storage bucket check
SELECT id, name, public
FROM storage.buckets
WHERE id = 'company-logos';

-- ---------------------------------------------------------------------------
-- Manual steps that cannot be done safely through SQL
-- ---------------------------------------------------------------------------
-- 1) Create or confirm Supabase Auth users for real app access.
-- 2) Set Authentication Site URL and Redirect URLs in the Supabase dashboard
--    to match the local dev origin and the eventual production origin.
-- 3) Deploy the Edge Function: supabase/functions/sync-ical/index.ts.
-- 4) Set Edge Function environment variables:
--      - SUPABASE_URL
--      - SUPABASE_SERVICE_ROLE_KEY
-- 5) If you want to test password reset locally, ensure the redirect origin
--    is allowed in the Auth redirect URL settings.
