-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for users
CREATE POLICY "Allow users to read their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Create teller_enrollments table
CREATE TABLE teller_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, enrollment_id)
);

-- Enable Row Level Security on teller_enrollments
ALTER TABLE teller_enrollments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for teller_enrollments
CREATE POLICY "Allow users to read their own enrollments" ON teller_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own enrollments" ON teller_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own enrollments" ON teller_enrollments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own enrollments" ON teller_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create email_logs table to track sent emails
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'welcome', 'spending_report', etc.
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL, -- 'success', 'failed'
  metadata JSONB -- Additional data like report period, email provider response, etc.
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at timestamp
CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_teller_enrollments
BEFORE UPDATE ON teller_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create index for faster lookup
CREATE INDEX idx_teller_enrollments_user_id ON teller_enrollments(user_id);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id); 