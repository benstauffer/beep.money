-- Create the teller_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS teller_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES teller_enrollments(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  last_four TEXT,
  institution_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

-- Add a trigger to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_teller_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teller_accounts_updated_at
BEFORE UPDATE ON teller_accounts
FOR EACH ROW
EXECUTE FUNCTION update_teller_accounts_updated_at();

-- Add RLS policies for teller_accounts
ALTER TABLE teller_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only read their own accounts
CREATE POLICY read_own_teller_accounts ON teller_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role can insert accounts
CREATE POLICY insert_teller_accounts ON teller_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' = 'service_role');

-- Users can only delete their own accounts
CREATE POLICY delete_own_teller_accounts ON teller_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS teller_accounts_user_id_idx ON teller_accounts(user_id);

-- Add an index on enrollment_id for faster lookups
CREATE INDEX IF NOT EXISTS teller_accounts_enrollment_id_idx ON teller_accounts(enrollment_id); 