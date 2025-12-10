-- =============================================================================
-- Money Manager - Supabase Database Schema
-- Paste this into Supabase SQL Editor
-- =============================================================================

-- Create bank_user_accounts table
CREATE TABLE IF NOT EXISTS bank_user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_type VARCHAR(50) NOT NULL,
  credentials JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  last_updated TIMESTAMP DEFAULT now(),
  UNIQUE(bank_type, credentials)
);

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id UUID NOT NULL REFERENCES bank_user_accounts(id) ON DELETE CASCADE,
  account_number VARCHAR(100),
  bank_type VARCHAR(50) NOT NULL,
  balance DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT now(),
  last_updated TIMESTAMP DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_account_id, account_number)
);
-- Create indexes for bank_accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_type ON bank_accounts(bank_type);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_account_id ON bank_accounts(user_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number ON bank_accounts(account_number);


-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  identifier INT,
  date TIMESTAMP NOT NULL,
  processed_date TIMESTAMP,
  original_amount DECIMAL(12, 2),
  original_currency VARCHAR(10),
  charged_amount DECIMAL(12, 2),
  description VARCHAR(500),
  memo VARCHAR(500),
  type VARCHAR(50),
  installment_number INT,
  installment_total INT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(account_id, identifier, date, original_amount)
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to accounts" ON bank_accounts
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to accounts" ON bank_accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to accounts" ON bank_accounts
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to transactions" ON transactions
  FOR INSERT WITH CHECK (true);


-- =============================================================================
-- Optional: Create a view for transaction summary
-- =============================================================================

DROP VIEW IF EXISTS transaction_summary CASCADE;
CREATE VIEW transaction_summary AS
SELECT 
  ba.id as account_id,
  ba.bank_type,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END) as total_debits,
  MAX(t.date) as last_transaction_date,
  ba.last_updated
FROM bank_accounts ba
LEFT JOIN transactions t ON ba.id = t.account_id
WHERE ba.is_active = true
GROUP BY ba.id, ba.bank_type, ba.last_updated;

-- =============================================================================
-- Optional: Create a function to get account statistics
-- =============================================================================

CREATE OR REPLACE FUNCTION get_account_stats(account_id UUID)
RETURNS TABLE (
  total_transactions BIGINT,
  total_income NUMERIC,
  total_expenses NUMERIC,
  average_transaction NUMERIC,
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(t.id),
    SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END),
    SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END),
    AVG(ABS(t.amount)),
    MIN(t.date),
    MAX(t.date)
  FROM transactions t
  WHERE t.account_id = $1;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================

