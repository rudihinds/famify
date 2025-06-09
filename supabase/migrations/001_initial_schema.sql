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
  pin_hash TEXT,
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

-- Indexes for performance
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_children_device_id ON children(device_id);
CREATE INDEX idx_connection_tokens_token ON connection_tokens(token);
CREATE INDEX idx_connection_tokens_parent_id ON connection_tokens(parent_id);
CREATE INDEX idx_connection_tokens_expires_at ON connection_tokens(expires_at);
CREATE INDEX idx_child_sessions_child_id ON child_sessions(child_id);
CREATE INDEX idx_child_sessions_device_id ON child_sessions(device_id);
CREATE INDEX idx_child_sessions_expires_at ON child_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

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

-- Seed initial task categories
INSERT INTO task_categories (name, icon, color, description) VALUES
  ('Chores', 'broom', '#4CAF50', 'Household tasks and responsibilities'),
  ('Health', 'heart', '#FF5252', 'Personal health and hygiene'),
  ('Education', 'book', '#2196F3', 'Learning and homework'),
  ('Personal Growth', 'star', '#FFC107', 'Self-improvement activities'),
  ('Family', 'people', '#9C27B0', 'Family time and relationships'),
  ('Outdoor', 'tree', '#00BCD4', 'Outdoor activities and exercise');

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
