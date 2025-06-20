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

-- Index for token lookup
CREATE INDEX idx_connection_tokens_token ON connection_tokens(token);
CREATE INDEX idx_connection_tokens_parent_id ON connection_tokens(parent_id);
CREATE INDEX idx_connection_tokens_expires_at ON connection_tokens(expires_at);

-- Enable RLS
ALTER TABLE connection_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY connection_tokens_policy ON connection_tokens
  FOR ALL USING (auth.uid() = parent_id);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM connection_tokens 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
