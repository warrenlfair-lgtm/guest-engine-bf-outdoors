-- Create configurable chemicals catalog for Chemical Usage entry

CREATE TABLE IF NOT EXISTS chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL,
  name TEXT NOT NULL,
  default_unit TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  billable_rate_per_unit NUMERIC NOT NULL DEFAULT 0,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure new pricing fields exist on older installs
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS billable_rate_per_unit NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE chemicals ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT true;

-- Prevent duplicate chemical names per company/global scope (company_id is nullable for now)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chemicals_company_name_unique
  ON chemicals (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name));

CREATE INDEX IF NOT EXISTS idx_chemicals_active ON chemicals(active);
CREATE INDEX IF NOT EXISTS idx_chemicals_name ON chemicals(LOWER(name));

ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on chemicals" ON chemicals;
CREATE POLICY "Allow all operations on chemicals" ON chemicals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed default chemical catalog (idempotent with unique index)
INSERT INTO chemicals (company_id, name, default_unit, active, cost_per_unit, billable_rate_per_unit, is_billable)
VALUES
  (NULL, 'Liquid Chlorine', 'gallons', true, 0, 0, true),
  (NULL, 'Chlorine Tablets', 'tablets', true, 0, 0, true),
  (NULL, 'pH Up', 'pounds', true, 0, 0, true),
  (NULL, 'pH Down', 'pounds', true, 0, 0, true),
  (NULL, 'Alkalinity Up', 'pounds', true, 0, 0, true),
  (NULL, 'Alkalinity Down', 'pounds', true, 0, 0, true),
  (NULL, 'Stabilizer / CYA', 'pounds', true, 0, 0, true),
  (NULL, 'Calcium Hardness Increaser', 'pounds', true, 0, 0, true),
  (NULL, 'Algaecide', 'quarts', true, 0, 0, true),
  (NULL, 'Clarifier', 'quarts', true, 0, 0, true),
  (NULL, 'Phosphate Remover', 'quarts', true, 0, 0, true),
  (NULL, 'Salt', 'bags', true, 0, 0, true),
  (NULL, 'Other', NULL, true, 0, 0, true)
ON CONFLICT (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name)) DO NOTHING;
