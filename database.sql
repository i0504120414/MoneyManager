-- =============================================================================
-- Money Manager - Supabase Database Schema
-- Paste this into Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE ALL TABLES
-- =============================================================================

-- Create bank_user_accounts table
CREATE TABLE IF NOT EXISTS bank_user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_type VARCHAR(50) NOT NULL,
  credentials JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  last_updated TIMESTAMP DEFAULT NULL,
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
  is_cancelled BOOLEAN DEFAULT false, -- Card cancelled/closed (not just inactive)
  UNIQUE(user_account_id, account_number)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  hash VARCHAR(64) UNIQUE,
  identifier BIGINT,
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
  created_at TIMESTAMP DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create recurring table (for fixed costs and installments)
CREATE TABLE IF NOT EXISTS recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'installment', 'direct_debit', 'detected'
  amount_avg DECIMAL(12, 2) NOT NULL,
  day_of_month INT,
  description VARCHAR(500),
  is_confirmed BOOLEAN DEFAULT false,
  installment_total INT, -- Total number of installments (for installment type)
  installment_current INT, -- Current installment number when first detected
  first_detected_date TIMESTAMP, -- Date when first detected (to calculate remaining)
  created_at TIMESTAMP DEFAULT now(),
  last_detected_at TIMESTAMP DEFAULT now()
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender VARCHAR(100) NOT NULL, -- 'add-account', 'scrape', 'recurring-detector', etc.
  level VARCHAR(20) NOT NULL, -- 'INFO', 'ERROR', 'WARNING', 'DEBUG'
  title VARCHAR(255),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Create transaction categories junction table
CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(transaction_id, category_id)
);

-- =============================================================================
-- STEP 2: CREATE ALL INDEXES
-- =============================================================================

-- Indexes for bank_accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_type ON bank_accounts(bank_type);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_account_id ON bank_accounts(user_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number ON bank_accounts(account_number);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Indexes for recurring
CREATE INDEX IF NOT EXISTS idx_recurring_account_id ON recurring(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_is_confirmed ON recurring(is_confirmed);

-- Indexes for logs
CREATE INDEX IF NOT EXISTS idx_logs_sender ON logs(sender);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Indexes for transaction_categories
CREATE INDEX IF NOT EXISTS idx_transaction_categories_transaction_id ON transaction_categories(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_category_id ON transaction_categories(category_id);

-- =============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- =============================================================================

ALTER TABLE bank_user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: CREATE RLS POLICIES
-- =============================================================================

-- Policies for bank_user_accounts
CREATE POLICY "Allow public read access to user_accounts" ON bank_user_accounts
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to user_accounts" ON bank_user_accounts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to user_accounts" ON bank_user_accounts
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to user_accounts" ON bank_user_accounts
  FOR DELETE USING (true);

-- Policies for bank_accounts
CREATE POLICY "Allow public read access to accounts" ON bank_accounts
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to accounts" ON bank_accounts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to accounts" ON bank_accounts
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to accounts" ON bank_accounts
  FOR DELETE USING (true);

-- Policies for transactions
CREATE POLICY "Allow public read access to transactions" ON transactions
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to transactions" ON transactions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to transactions" ON transactions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to transactions" ON transactions
  FOR DELETE USING (true);

-- Policies for categories
CREATE POLICY "Allow public read access to categories" ON categories
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to categories" ON categories
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to categories" ON categories
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to categories" ON categories
  FOR DELETE USING (true);

-- Policies for recurring
CREATE POLICY "Allow public read access to recurring" ON recurring
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to recurring" ON recurring
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to recurring" ON recurring
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete to recurring" ON recurring
  FOR DELETE USING (true);

-- Policies for logs
CREATE POLICY "Allow public read access to logs" ON logs
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to logs" ON logs
  FOR INSERT WITH CHECK (true);

-- Policies for notifications
CREATE POLICY "Allow public read access to notifications" ON notifications
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to notifications" ON notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to notifications" ON notifications
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policies for transaction_categories
CREATE POLICY "Allow public read access to transaction_categories" ON transaction_categories
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert to transaction_categories" ON transaction_categories
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete to transaction_categories" ON transaction_categories
  FOR DELETE USING (true);

-- =============================================================================
-- STEP 5: CREATE VIEWS
-- =============================================================================

DROP VIEW IF EXISTS transaction_summary CASCADE;
CREATE VIEW transaction_summary AS
SELECT 
  ba.id as account_id,
  ba.bank_type,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.type = 'credit' THEN t.charged_amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN t.type = 'debit' THEN t.charged_amount ELSE 0 END) as total_debits,
  MAX(t.date) as last_transaction_date,
  ba.last_updated
FROM bank_accounts ba
LEFT JOIN transactions t ON ba.id = t.account_id
WHERE ba.is_active = true
GROUP BY ba.id, ba.bank_type, ba.last_updated;

-- =============================================================================
-- STEP 6: CREATE FUNCTIONS
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
    SUM(CASE WHEN t.type = 'credit' THEN t.charged_amount ELSE 0 END),
    SUM(CASE WHEN t.type = 'debit' THEN t.charged_amount ELSE 0 END),
    AVG(ABS(t.charged_amount)),
    MIN(t.date),
    MAX(t.date)
  FROM transactions t
  WHERE t.account_id = $1;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- DONE! All tables, indexes, RLS policies, views and functions created.
-- =============================================================================

