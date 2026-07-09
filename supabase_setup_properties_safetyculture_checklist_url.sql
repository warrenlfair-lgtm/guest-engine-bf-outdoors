-- Add SafetyCulture checklist URL support per property

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS safetyculture_checklist_url TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_safetyculture_checklist_url
  ON properties (safetyculture_checklist_url);
