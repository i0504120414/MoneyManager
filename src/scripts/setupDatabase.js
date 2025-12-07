import { supabase } from '../db/client.js';

/**
 * Initialize Supabase database tables
 */
export async function setupDatabase() {
  console.log('Setting up Supabase database...');

  try {
    // Create bank_user_accounts table
    const { error: userAccountsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS bank_user_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bank_type VARCHAR(50) NOT NULL,
            credentials JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            is_active BOOLEAN DEFAULT true,
            UNIQUE(bank_type, credentials)
          );
        `,
      });

    if (userAccountsError) {
      console.warn('Note: bank_user_accounts table creation note:', userAccountsError.message);
    }

    // Create bank_accounts table
    const { error: accountsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS bank_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_account_id UUID NOT NULL REFERENCES bank_user_accounts(id) ON DELETE CASCADE,
            account_number VARCHAR(100),
            account_name VARCHAR(200),
            bank_type VARCHAR(50) NOT NULL,
            balance DECIMAL(12, 2),
            currency VARCHAR(10) DEFAULT 'ILS',
            created_at TIMESTAMP DEFAULT now(),
            last_updated TIMESTAMP DEFAULT now(),
            is_active BOOLEAN DEFAULT true,
            UNIQUE(user_account_id, account_number)
          );

          CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_type ON bank_accounts(bank_type);
          CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
          CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_account_id ON bank_accounts(user_account_id);
          CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number ON bank_accounts(account_number);
        `,
      });

    if (accountsError) {
      console.warn('Note: bank_accounts table creation note:', accountsError.message);
    }

    // Create transactions table
    const { error: transactionsError } = await supabase
      .rpc('exec_sql', {
        sql: `
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

          CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
          CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
          CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        `,
      });

    if (transactionsError) {
      console.warn('Note: transactions table creation note:', transactionsError.message);
    }

    console.log('✓ Database setup complete');
  } catch (error) {
    console.error(`✗ Database setup failed: ${error.message}`);
    console.log('Note: You may need to create tables manually in Supabase SQL editor using database.sql');
  }
}
