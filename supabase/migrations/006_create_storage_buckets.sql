-- Create storage bucket for task photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  true, -- Public bucket so photos can be viewed
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for task-photos bucket
-- Note: Since we're in development with RLS disabled, these policies won't be enforced
-- but they're here for when RLS is re-enabled in production

-- Allow authenticated users to upload photos for their own tasks
CREATE POLICY "Users can upload task photos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'task-photos');

-- Allow public read access to task photos
CREATE POLICY "Task photos are publicly accessible" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'task-photos');

-- Allow users to update their own task photos
CREATE POLICY "Users can update their task photos" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'task-photos');

-- Allow users to delete their own task photos
CREATE POLICY "Users can delete their task photos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'task-photos');