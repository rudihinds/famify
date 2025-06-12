-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  famcoin_conversion_rate INTEGER DEFAULT 10, -- FAMCOINS per £1
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Children linked to parents
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  avatar_url TEXT,
  pin_hash TEXT NOT NULL,
  device_id TEXT,
  famcoin_balance INTEGER DEFAULT 0,
  focus_areas TEXT[] DEFAULT '{}', -- Selected categories
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection tokens for QR code linking
CREATE TABLE connection_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  child_name TEXT NOT NULL,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child sessions for tracking active logins
CREATE TABLE child_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task categories (system-defined)
CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reusable task templates
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id) NOT NULL,
  photo_proof_required BOOLEAN DEFAULT false,
  effort_score INTEGER CHECK (effort_score BETWEEN 1 AND 5),
  is_system BOOLEAN DEFAULT true, -- false for user-created templates
  parent_id UUID REFERENCES profiles(id), -- null for system templates
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequences for individual children
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('weekly', 'fortnightly', 'monthly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_currency DECIMAL(10,2) NOT NULL,
  budget_famcoins INTEGER NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'GBP', -- ISO currency code
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT one_active_sequence_per_child UNIQUE (child_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Task groups within sequences
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  active_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task instances within groups
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES task_templates(id) NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
  custom_name TEXT, -- Override template name if needed
  custom_description TEXT, -- Add context for this instance
  famcoin_value INTEGER NOT NULL,
  photo_proof_required BOOLEAN NOT NULL,
  effort_score INTEGER CHECK (effort_score BETWEEN 1 AND 5),
  is_bonus_task BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily task completions
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_instance_id UUID REFERENCES task_instances(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'child_completed', 'parent_approved', 'parent_rejected', 'excused')) DEFAULT 'pending',
  photo_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  famcoins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_instance_id, due_date)
);

-- FAMCOIN transaction ledger
CREATE TABLE famcoin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive for earning, negative for spending
  type TEXT CHECK (type IN ('earned', 'spent', 'adjusted', 'bonus')) NOT NULL,
  task_completion_id UUID REFERENCES task_completions(id),
  wishlist_item_id UUID REFERENCES wishlist_items(id),
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child wishlist items
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_currency DECIMAL(10,2) NOT NULL,
  price_famcoins INTEGER NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'GBP', -- ISO currency code
  category TEXT NOT NULL,
  image_url TEXT,
  url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'requested', 'redeemed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unavailable days (holidays, sick days, etc.)
CREATE TABLE unavailable_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- Subscription management
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'past_due')) NOT NULL,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_children_device_id ON children(device_id);
CREATE INDEX idx_connection_tokens_token ON connection_tokens(token);
CREATE INDEX idx_connection_tokens_parent_id ON connection_tokens(parent_id);
CREATE INDEX idx_connection_tokens_expires_at ON connection_tokens(expires_at);
CREATE INDEX idx_child_sessions_child_id ON child_sessions(child_id);
CREATE INDEX idx_child_sessions_device_id ON child_sessions(device_id);
CREATE INDEX idx_child_sessions_expires_at ON child_sessions(expires_at);
CREATE INDEX idx_sequences_child_id_status ON sequences(child_id, status);
CREATE INDEX idx_task_instances_sequence_id ON task_instances(sequence_id);
CREATE INDEX idx_task_instances_group_id ON task_instances(group_id);
CREATE INDEX idx_task_completions_child_id_due_date ON task_completions(child_id, due_date);
CREATE INDEX idx_task_completions_status ON task_completions(status);
CREATE INDEX idx_famcoin_transactions_child_id ON famcoin_transactions(child_id);
CREATE INDEX idx_wishlist_items_child_id_status ON wishlist_items(child_id, status);
CREATE INDEX idx_task_templates_category_id ON task_templates(category_id);
CREATE INDEX idx_task_templates_parent_id ON task_templates(parent_id);
CREATE INDEX idx_unavailable_days_child_date ON unavailable_days(child_id, date);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE famcoin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailable_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Children: Parents can manage their own children
CREATE POLICY "Parents can view their children" ON children
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert children" ON children
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their children" ON children
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their children" ON children
  FOR DELETE USING (auth.uid() = parent_id);

-- Connection tokens: Parents can manage their own tokens
CREATE POLICY "Parents can view their connection tokens" ON connection_tokens
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert connection tokens" ON connection_tokens
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their connection tokens" ON connection_tokens
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "Anyone can read unused tokens for validation" ON connection_tokens
  FOR SELECT USING (used = false AND expires_at > NOW());

-- Child sessions: Parents can view sessions for their children
CREATE POLICY "Parents can view child sessions" ON child_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_sessions.child_id 
      AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can manage child sessions" ON child_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_sessions.child_id 
      AND children.parent_id = auth.uid()
    )
  );

-- Task categories: Everyone can read system categories
CREATE POLICY "Anyone can view system categories" ON task_categories
  FOR SELECT USING (is_system = true);

-- Task templates: System templates readable by all, user templates only by creator
CREATE POLICY "Task templates read policy" ON task_templates
  FOR SELECT USING (is_system = true OR parent_id = auth.uid());

CREATE POLICY "Task templates create policy" ON task_templates
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Task templates update policy" ON task_templates
  FOR UPDATE USING (parent_id = auth.uid());

-- Sequences: Parents can manage sequences for their children
CREATE POLICY "Parent sequences policy" ON sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = sequences.child_id AND children.parent_id = auth.uid())
  );

-- Groups: Parents can manage groups for their children's sequences
CREATE POLICY "Parent groups policy" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sequences
      JOIN children ON children.id = sequences.child_id
      WHERE sequences.id = groups.sequence_id AND children.parent_id = auth.uid()
    )
  );

-- Task instances: Parents can manage task instances for their children
CREATE POLICY "Parent task instances policy" ON task_instances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sequences
      JOIN children ON children.id = sequences.child_id
      WHERE sequences.id = task_instances.sequence_id AND children.parent_id = auth.uid()
    )
  );

-- Task completions: Parents can manage completions for their children
CREATE POLICY "Parent task completions policy" ON task_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = task_completions.child_id AND children.parent_id = auth.uid()
    )
  );

-- FAMCOIN transactions: Parents can view transactions for their children
CREATE POLICY "Parent famcoin transactions policy" ON famcoin_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = famcoin_transactions.child_id AND children.parent_id = auth.uid()
    )
  );

-- Wishlist items: Parents can manage wishlist items for their children
CREATE POLICY "Parent wishlist items policy" ON wishlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = wishlist_items.child_id AND children.parent_id = auth.uid()
    )
  );

-- Unavailable days: Parents can manage unavailable days for their children
CREATE POLICY "Parent unavailable days policy" ON unavailable_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = unavailable_days.child_id AND children.parent_id = auth.uid()
    )
  );

-- Subscriptions: Parents can only access their own subscriptions
CREATE POLICY "Parent subscriptions policy" ON subscriptions
  FOR ALL USING (auth.uid() = parent_id);

-- Seed initial task categories
INSERT INTO task_categories (name, icon, color, description) VALUES
  ('Chores', 'broom', '#4CAF50', 'Household tasks and responsibilities'),
  ('Health', 'heart', '#FF5252', 'Personal health and hygiene'),
  ('Education', 'book', '#2196F3', 'Learning and homework'),
  ('Personal Growth', 'star', '#FFC107', 'Self-improvement activities'),
  ('Family', 'people', '#9C27B0', 'Family time and relationships'),
  ('Outdoor', 'tree', '#00BCD4', 'Outdoor activities and exercise');

-- Seed initial task templates
INSERT INTO task_templates (name, description, category_id, photo_proof_required, effort_score) VALUES
  ('Make Bed', 'Tidy bed with pillows arranged', (SELECT id FROM task_categories WHERE name = 'Chores'), false, 2),
  ('Brush Teeth', 'Morning dental hygiene', (SELECT id FROM task_categories WHERE name = 'Health'), false, 1),
  ('Do Homework', 'Complete school assignments', (SELECT id FROM task_categories WHERE name = 'Education'), true, 4),
  ('Read for 20 Minutes', 'Daily reading practice', (SELECT id FROM task_categories WHERE name = 'Personal Growth'), false, 3),
  ('Set Dinner Table', 'Prepare table for family meal', (SELECT id FROM task_categories WHERE name = 'Family'), false, 2),
  ('Walk Dog', 'Take dog for daily walk', (SELECT id FROM task_categories WHERE name = 'Outdoor'), true, 3);

-- Database Functions

-- Function to safely increment FAMCOIN balance
CREATE OR REPLACE FUNCTION increment_famcoin_balance(
  child_id UUID,
  amount INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE children
  SET famcoin_balance = GREATEST(0, famcoin_balance + amount)
  WHERE id = child_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get completion statistics
CREATE OR REPLACE FUNCTION get_completion_stats(
  p_child_id UUID,
  p_date DATE
) RETURNS TABLE (
  total_tasks INTEGER,
  completed_tasks INTEGER,
  excused_tasks INTEGER,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_tasks,
    COUNT(*) FILTER (WHERE status = 'parent_approved')::INTEGER as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'excused')::INTEGER as excused_tasks,
    CASE
      WHEN COUNT(*) FILTER (WHERE status != 'excused') = 0 THEN 100
      ELSE ROUND(
        COUNT(*) FILTER (WHERE status = 'parent_approved')::NUMERIC /
        COUNT(*) FILTER (WHERE status != 'excused')::NUMERIC * 100, 2
      )
    END as completion_percentage
  FROM task_completions
  WHERE child_id = p_child_id
    AND due_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM connection_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM child_sessions 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
