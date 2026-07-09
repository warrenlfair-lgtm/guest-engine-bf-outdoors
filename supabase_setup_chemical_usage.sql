-- Create chemical_usage table for tracking pool chemical use per cleaning task

CREATE TABLE IF NOT EXISTS chemical_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  chemical_id UUID NULL REFERENCES chemicals(id) ON DELETE SET NULL,
  property_name TEXT,
  service_date DATE,
  chemical_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chemical_usage
ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE chemical_usage
ADD COLUMN IF NOT EXISTS chemical_id UUID NULL REFERENCES chemicals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chemical_usage_task_id ON chemical_usage(task_id);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_property_service_date ON chemical_usage(property_id, service_date);
CREATE INDEX IF NOT EXISTS idx_chemical_usage_chemical_id ON chemical_usage(chemical_id);

ALTER TABLE chemical_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on chemical_usage" ON chemical_usage;
CREATE POLICY "Allow all operations on chemical_usage" ON chemical_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);
