-- Create and configure public storage bucket for company logos

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- Ensure RLS policies allow app upload/read/update/delete on this bucket
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
