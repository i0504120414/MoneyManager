-- =============================================================================
-- Money Manager - Extension Schema (App Features)
-- =============================================================================

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  icon VARCHAR(50), -- Name of the icon identifier
  is_system BOOLEAN DEFAULT false, -- If true, user cannot delete
  created_at TIMESTAMP DEFAULT now()
);

-- Insert default categories
INSERT INTO categories (name, type, is_system, icon) VALUES
('Supermarket', 'expense', true, 'cart'),
('Restaurants', 'expense', true, 'food'),
('Transportation', 'expense', true, 'car'),
('Salary', 'income', true, 'cash'),
('Utilities', 'expense', true, 'bolt'),
('Rent/Mortgage', 'expense', true, 'home'),
('Health', 'expense', true, 'medical'),
('Entertainment', 'expense', true, 'movie'),
('Shopping', 'expense', true, 'bag'),
('General', 'expense', true, 'dots')
ON CONFLICT DO NOTHING;

-- 2. Transaction Category Mapping (Auto-categorization rules)
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(200) NOT NULL, -- The text to match in description/memo
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  match_type VARCHAR(20) DEFAULT 'contains', -- 'contains', 'exact', 'starts_with'
  created_at TIMESTAMP DEFAULT now()
);

-- 3. Update Transactions Table
-- We add category_id and manual entry flags
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index for category searches
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- 4. Budgets / Goals
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  period VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(category_id, period)
);

-- 5. Recurring Transactions (Fixed Expenses)
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(12, 2), -- Can be null if variable
  expected_day INT CHECK (expected_day BETWEEN 1 AND 31),
  category_id UUID REFERENCES categories(id),
  frequency VARCHAR(20) DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  last_generated_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- 6. RLS Policies for new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Simple public policies for now (Single user app assumed based on context, can be restricted later)
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public write categories" ON categories FOR ALL USING (true);

CREATE POLICY "Public read rules" ON category_rules FOR SELECT USING (true);
CREATE POLICY "Public write rules" ON category_rules FOR ALL USING (true);

CREATE POLICY "Public read budgets" ON budgets FOR SELECT USING (true);
CREATE POLICY "Public write budgets" ON budgets FOR ALL USING (true);

CREATE POLICY "Public read recurring" ON recurring_expenses FOR SELECT USING (true);
CREATE POLICY "Public write recurring" ON recurring_expenses FOR ALL USING (true);
