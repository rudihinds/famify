-- Disable RLS on task-related tables for development
-- This is a temporary measure for development only

-- Disable RLS on all task-related tables
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE sequences DISABLE ROW LEVEL SECURITY;

-- Add comments to remember to re-enable for production
COMMENT ON TABLE task_completions IS 'RLS disabled for development - MUST re-enable for production';
COMMENT ON TABLE task_instances IS 'RLS disabled for development - MUST re-enable for production';
COMMENT ON TABLE groups IS 'RLS disabled for development - MUST re-enable for production';
COMMENT ON TABLE task_templates IS 'RLS disabled for development - MUST re-enable for production';
COMMENT ON TABLE task_categories IS 'RLS disabled for development - MUST re-enable for production';
COMMENT ON TABLE sequences IS 'RLS disabled for development - MUST re-enable for production';