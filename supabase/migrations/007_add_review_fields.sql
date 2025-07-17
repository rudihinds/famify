-- Add review-related fields to task_completions table

-- Add feedback field for parent comments
ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add rejection tracking fields
ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for faster queries on parent review screens
CREATE INDEX IF NOT EXISTS idx_task_completions_status_completed_at 
ON task_completions(status, completed_at DESC) 
WHERE status = 'child_completed';

-- Add composite index for parent queries
CREATE INDEX IF NOT EXISTS idx_task_completions_parent_status 
ON task_completions(child_id, status) 
WHERE status IN ('child_completed', 'parent_approved', 'parent_rejected');