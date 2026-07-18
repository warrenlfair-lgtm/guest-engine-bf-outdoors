-- Phase 2A: Company-Based Data Ownership (Migration SQL Only)
-- Purpose: Introduce company ownership scaffolding while keeping current app behavior unchanged.
-- Notes:
--   - This script is idempotent and safe to run once per environment.
--   - It does NOT enable RLS and does NOT set company_id columns to NOT NULL.
--   - It does NOT delete or alter existing business records.

BEGIN;

-- Ensure UUID generator is available where needed.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core ownership tables ---------------------------------------------------

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE public.companies
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique
  ON public.companies (slug)
  WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_unique
  ON public.companies (LOWER(name));

CREATE TABLE IF NOT EXISTS public.company_users (
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_users_company_user_key UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_users
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE public.company_users
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.company_users
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.company_users
  ALTER COLUMN role SET DEFAULT 'member';

UPDATE public.company_users
SET role = COALESCE(NULLIF(TRIM(role), ''), 'member')
WHERE role IS NULL OR TRIM(role) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'company_users'
      AND c.contype = 'c'
      AND c.conname = 'company_users_role_check'
  ) THEN
    ALTER TABLE public.company_users
      ADD CONSTRAINT company_users_role_check
      CHECK (role IN ('owner', 'admin', 'member'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'company_users'
      AND c.contype = 'u'
      AND c.conname = 'company_users_company_user_key'
  ) THEN
    ALTER TABLE public.company_users
      ADD CONSTRAINT company_users_company_user_key UNIQUE (company_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'company_users'
      AND c.contype = 'f'
      AND c.conname = 'company_users_company_id_fkey'
  ) THEN
    ALTER TABLE public.company_users
      ADD CONSTRAINT company_users_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'company_users'
      AND c.contype = 'f'
      AND c.conname = 'company_users_user_id_fkey'
  ) THEN
    ALTER TABLE public.company_users
      ADD CONSTRAINT company_users_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON public.company_users(role);

-- 2) Seed Fair Ventures company (idempotent) --------------------------------

INSERT INTO public.companies (name, slug)
SELECT 'Fair Ventures', 'fair-ventures'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
);

-- 3) Add nullable company_id to owned tables --------------------------------

ALTER TABLE IF EXISTS public.properties            ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS public.cleaning_tasks        ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS public.reservations          ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS public.operations_reminders  ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS public.chemical_usage        ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS public.invoices              ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE IF EXISTS public.invoice_items         ADD COLUMN IF NOT EXISTS company_id UUID;

-- 4) Backfill company_id to Fair Ventures for existing rows ------------------

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.properties p
SET company_id = fc.id
FROM fair_company fc
WHERE p.company_id IS NULL;

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.cleaning_tasks t
SET company_id = fc.id
FROM fair_company fc
WHERE t.company_id IS NULL;

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.reservations r
SET company_id = fc.id
FROM fair_company fc
WHERE r.company_id IS NULL;

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.operations_reminders o
SET company_id = fc.id
FROM fair_company fc
WHERE o.company_id IS NULL;

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.chemical_usage cu
SET company_id = fc.id
FROM fair_company fc
WHERE cu.company_id IS NULL;

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.invoices i
SET company_id = fc.id
FROM fair_company fc
WHERE i.company_id IS NULL;

-- 5) invoice_items company_id derivation order -------------------------------
-- Priority required by request:
--   1) invoices.company_id
--   2) cleaning_tasks.company_id
--   3) chemical_usage.company_id
--   4) fallback to Fair Ventures for any remaining NULLs

UPDATE public.invoice_items ii
SET company_id = i.company_id
FROM public.invoices i
WHERE ii.company_id IS NULL
  AND ii.invoice_id = i.id
  AND i.company_id IS NOT NULL;

UPDATE public.invoice_items ii
SET company_id = t.company_id
FROM public.cleaning_tasks t
WHERE ii.company_id IS NULL
  AND ii.task_id = t.id
  AND t.company_id IS NOT NULL;

UPDATE public.invoice_items ii
SET company_id = cu.company_id
FROM public.chemical_usage cu
WHERE ii.company_id IS NULL
  AND ii.chemical_usage_id = cu.id
  AND cu.company_id IS NOT NULL;

WITH fair_company AS (
  SELECT id
  FROM public.companies
  WHERE LOWER(name) = LOWER('Fair Ventures')
  ORDER BY created_at
  LIMIT 1
)
UPDATE public.invoice_items ii
SET company_id = fc.id
FROM fair_company fc
WHERE ii.company_id IS NULL;

-- 6) Add foreign keys safely (no duplicate FK constraints) -------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'properties'
      AND c.conname = 'properties_company_id_fkey'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'cleaning_tasks'
      AND c.conname = 'cleaning_tasks_company_id_fkey'
  ) THEN
    ALTER TABLE public.cleaning_tasks
      ADD CONSTRAINT cleaning_tasks_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'reservations'
      AND c.conname = 'reservations_company_id_fkey'
  ) THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'operations_reminders'
      AND c.conname = 'operations_reminders_company_id_fkey'
  ) THEN
    ALTER TABLE public.operations_reminders
      ADD CONSTRAINT operations_reminders_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'chemical_usage'
      AND c.conname = 'chemical_usage_company_id_fkey'
  ) THEN
    ALTER TABLE public.chemical_usage
      ADD CONSTRAINT chemical_usage_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'invoices'
      AND c.conname = 'invoices_company_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'invoice_items'
      AND c.conname = 'invoice_items_company_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 7) Add indexes safely ------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_properties_company_id ON public.properties(company_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_company_id ON public.cleaning_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_reservations_company_id ON public.reservations(company_id);
CREATE INDEX IF NOT EXISTS idx_operations_reminders_company_id ON public.operations_reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_company_id ON public.chemical_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_company_id ON public.invoice_items(company_id);

COMMIT;

-- 8) Link existing Supabase Auth users to Fair Ventures ----------------------
-- IMPORTANT:
--   - Do not hard-code UUIDs.
--   - Run the SELECT query first to identify user IDs.
--   - Then run INSERT statements with those IDs.

-- Verification query for Warren to identify:
--   - warren.l.fair@gmail.com
--   - existing employee user
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- Optional narrowed query:
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
WHERE LOWER(email) = LOWER('warren.l.fair@gmail.com')
   OR LOWER(email) LIKE '%@%'
ORDER BY created_at;

-- Template inserts (run manually after identifying actual auth.users.id values):
-- INSERT INTO public.company_users (company_id, user_id, role)
-- SELECT c.id, u.id, 'owner'
-- FROM public.companies c
-- JOIN auth.users u ON u.email = 'warren.l.fair@gmail.com'
-- WHERE LOWER(c.name) = LOWER('Fair Ventures')
-- ON CONFLICT (company_id, user_id) DO NOTHING;

-- INSERT INTO public.company_users (company_id, user_id, role)
-- SELECT c.id, u.id, 'member'
-- FROM public.companies c
-- JOIN auth.users u ON u.email = 'employee-email@example.com'
-- WHERE LOWER(c.name) = LOWER('Fair Ventures')
-- ON CONFLICT (company_id, user_id) DO NOTHING;

-- 9) Post-migration verification queries -------------------------------------

-- A) Fair Ventures exists
SELECT id, name, created_at
FROM public.companies
WHERE LOWER(name) = LOWER('Fair Ventures');

-- B) Every company-owned row has company_id
SELECT 'properties' AS table_name, COUNT(*) AS null_company_id_rows FROM public.properties WHERE company_id IS NULL
UNION ALL
SELECT 'cleaning_tasks', COUNT(*) FROM public.cleaning_tasks WHERE company_id IS NULL
UNION ALL
SELECT 'reservations', COUNT(*) FROM public.reservations WHERE company_id IS NULL
UNION ALL
SELECT 'operations_reminders', COUNT(*) FROM public.operations_reminders WHERE company_id IS NULL
UNION ALL
SELECT 'chemical_usage', COUNT(*) FROM public.chemical_usage WHERE company_id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*) FROM public.invoices WHERE company_id IS NULL
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM public.invoice_items WHERE company_id IS NULL;

-- C) No orphan company references exist
SELECT 'properties' AS table_name, COUNT(*) AS orphan_rows
FROM public.properties p
LEFT JOIN public.companies c ON c.id = p.company_id
WHERE p.company_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'cleaning_tasks', COUNT(*)
FROM public.cleaning_tasks t
LEFT JOIN public.companies c ON c.id = t.company_id
WHERE t.company_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'reservations', COUNT(*)
FROM public.reservations r
LEFT JOIN public.companies c ON c.id = r.company_id
WHERE r.company_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'operations_reminders', COUNT(*)
FROM public.operations_reminders o
LEFT JOIN public.companies c ON c.id = o.company_id
WHERE o.company_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'chemical_usage', COUNT(*)
FROM public.chemical_usage cu
LEFT JOIN public.companies c ON c.id = cu.company_id
WHERE cu.company_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'invoices', COUNT(*)
FROM public.invoices i
LEFT JOIN public.companies c ON c.id = i.company_id
WHERE i.company_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'invoice_items', COUNT(*)
FROM public.invoice_items ii
LEFT JOIN public.companies c ON c.id = ii.company_id
WHERE ii.company_id IS NOT NULL AND c.id IS NULL;

-- D) invoice_items company_id matches parent invoice company_id (where invoice_id exists)
SELECT COUNT(*) AS invoice_item_invoice_company_mismatches
FROM public.invoice_items ii
JOIN public.invoices i ON i.id = ii.invoice_id
WHERE ii.company_id IS DISTINCT FROM i.company_id;
