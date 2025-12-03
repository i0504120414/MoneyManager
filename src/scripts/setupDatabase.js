import { supabase } from '../db/client.js';

/**
 * Initialize Supabase database tables
 */
export async function setupDatabase() {
  console.log('Setting up Supabase database...');

  try {
    // Create bank_accounts table
    const { error: accountsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS bank_accounts (
            id UUID PRIMARY KEY,
            bank_type VARCHAR(50) NOT NULL,
            credentials JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            last_updated TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true
          );

          CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_type ON bank_accounts(bank_type);
          CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
        `,
      });

    // Create transactions table
    const { error: transactionsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY,
            account_id UUID NOT NULL REFERENCES bank_accounts(id),
            date TIMESTAMP NOT NULL,
            description VARCHAR(500),
            amount DECIMAL(12, 2),
            type VARCHAR(10) NOT NULL,
            category VARCHAR(50),
            raw_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(account_id, date, description, amount)
          );

          CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
          CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        `,
      });

    console.log('✓ Database setup complete');
  } catch (error) {
    console.error(`✗ Database setup failed: ${error.message}`);
    console.log('Note: You may need to create tables manually in Supabase SQL editor');
  }
}
