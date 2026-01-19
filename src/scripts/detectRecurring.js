/**
 * Detect Recurring Transactions (Fixed Costs)
 * 
 * This script identifies three types of recurring transactions:
 * 1. Installments: Extracted from transaction metadata (e.g., "Payment 3 of 12")
 * 2. Direct Debits: Identified by description keywords (e.g., "Direct Debit", "Standing Order")
 * 3. Algorithmic Detection: Transactions with same name and similar amount over 3+ consecutive months
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('detect-recurring');

/**
 * Detect installment transactions from metadata
 */
async function detectInstallments(supabase, accountId) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, installment_number, installment_total, description, charged_amount, date, account_id')
    .eq('account_id', accountId)
    .not('installment_number', 'is', null)
    .not('installment_total', 'is', null);
  
  if (error) {
    logger.error('Failed to query transactions for installments', { error: error.message });
    return [];
  }

  const recurringInstallments = [];

  for (const tx of transactions) {
    // Check if this is an installment transaction
    if (tx.installment_number && tx.installment_total && tx.installment_number === 1) {
      // This is the first installment - create recurring entry
      const { data: existing } = await supabase
        .from('recurring')
        .select('id')
        .eq('account_id', accountId)
        .eq('type', 'installment')
        .eq('description', tx.description)
        .single();
      
      if (!existing) {
        recurringInstallments.push({
          account_id: accountId,
          type: 'installment',
          amount_avg: tx.charged_amount,
          description: `${tx.description} (${tx.installment_number}/${tx.installment_total})`,
          is_confirmed: false,
        });
        logger.info('Detected installment transaction', {
          account_id: accountId,
          description: tx.description,
          total_installments: tx.installment_total,
          amount: tx.charged_amount
        });
      }
    }
  }

  return recurringInstallments;
}

/**
 * Detect direct debit transactions by keyword matching
 */
async function detectDirectDebits(supabase, accountId) {
  const directDebitKeywords = [
    'הוראת קבע',      // Hebrew: Direct Debit
    'העברה קבועה',    // Hebrew: Standing Order
    'תשלום קבוע',     // Hebrew: Fixed Payment
    'direct debit',
    'standing order',
    'recurring payment',
    'subscription',
  ];

  // Create regex pattern for keyword matching
  const keywordPattern = directDebitKeywords.join('|');
  const regex = new RegExp(keywordPattern, 'i');

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, description, charged_amount, date, account_id')
    .eq('account_id', accountId)
    .limit(1000);
  
  if (error) {
    logger.error('Failed to query transactions for direct debits', { error: error.message });
    return [];
  }

  const recurringDebits = [];
  const seenDescriptions = new Set();

  for (const tx of transactions) {
    if (regex.test(tx.description) && !seenDescriptions.has(tx.description)) {
      seenDescriptions.add(tx.description);
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('recurring')
        .select('id')
        .eq('account_id', accountId)
        .eq('type', 'direct_debit')
        .eq('description', tx.description)
        .single();
      
      if (!existing) {
        recurringDebits.push({
          account_id: accountId,
          type: 'direct_debit',
          amount_avg: Math.abs(tx.charged_amount),
          description: tx.description,
          is_confirmed: true, // Direct debits are more reliable
        });
        logger.info('Detected direct debit transaction', {
          account_id: accountId,
          description: tx.description,
          amount: tx.charged_amount
        });
      }
    }
  }

  return recurringDebits;
}

/**
 * Detect recurring transactions algorithmically
 * Looks for transactions with:
 * - Same description (or similar)
 * - Similar amount (within 10% threshold)
 * - Occurring at least 3 consecutive months apart
 */
async function detectAlgorithmicRecurring(supabase, accountId) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, description, charged_amount, date')
    .eq('account_id', accountId)
    .order('date', { ascending: true });
  
  if (error) {
    logger.error('Failed to query transactions for algorithmic detection', { error: error.message });
    return [];
  }

  const recurringCandidates = [];
  const transactionsByDescription = {};

  // Group transactions by description
  for (const tx of transactions) {
    const desc = tx.description.trim().toLowerCase();
    if (!transactionsByDescription[desc]) {
      transactionsByDescription[desc] = [];
    }
    transactionsByDescription[desc].push(tx);
  }

  // Analyze groups for recurring patterns
  for (const [description, txs] of Object.entries(transactionsByDescription)) {
    if (txs.length < 3) continue; // Need at least 3 transactions

    const amounts = txs.map(t => Math.abs(t.charged_amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const amountStdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / amounts.length
    );

    // Check if amounts are consistent (within 10%)
    const isConsistent = amountStdDev / avgAmount < 0.1;
    
    if (isConsistent) {
      // Check if transactions are roughly monthly
      const dates = txs.map(t => new Date(t.date));
      let hasMonthlyPattern = false;

      for (let i = 0; i < dates.length - 2; i++) {
        const gap1 = Math.abs(dates[i + 1] - dates[i]) / (1000 * 60 * 60 * 24);
        const gap2 = Math.abs(dates[i + 2] - dates[i + 1]) / (1000 * 60 * 60 * 24);
        
        // Both gaps should be between 20-45 days (roughly monthly)
        if (gap1 >= 20 && gap1 <= 45 && gap2 >= 20 && gap2 <= 45) {
          hasMonthlyPattern = true;
          break;
        }
      }

      if (hasMonthlyPattern) {
        // Check if already exists
        const { data: existing } = await supabase
          .from('recurring')
          .select('id')
          .eq('account_id', accountId)
          .eq('type', 'detected')
          .eq('description', description)
          .single();
        
        if (!existing) {
          recurringCandidates.push({
            account_id: accountId,
            type: 'detected',
            amount_avg: avgAmount,
            description: description,
            is_confirmed: false, // Needs user confirmation
          });
          logger.info('Detected recurring transaction pattern', {
            account_id: accountId,
            description: description,
            amount: avgAmount,
            count: txs.length
          });
        }
      }
    }
  }

  return recurringCandidates;
}

/**
 * Save detected recurring transactions to database
 */
async function saveRecurringTransactions(supabase, recurringList) {
  if (recurringList.length === 0) {
    console.log('No new recurring transactions detected');
    return 0;
  }

  const { data, error } = await supabase
    .from('recurring')
    .insert(recurringList);
  
  if (error) {
    logger.error('Failed to save recurring transactions', { error: error.message });
    return 0;
  }

  console.log(`✓ Saved ${recurringList.length} recurring transaction(s)`);
  logger.info('Recurring transactions saved', { count: recurringList.length });
  return recurringList.length;
}

/**
 * Main function - detect all recurring transactions for an account
 */
async function detectRecurringForAccount(supabase, accountId) {
  console.log(`Detecting recurring transactions for account: ${accountId}`);
  
  try {
    const allRecurring = [];

    // 1. Detect installments
    const installments = await detectInstallments(supabase, accountId);
    allRecurring.push(...installments);

    // 2. Detect direct debits
    const directDebits = await detectDirectDebits(supabase, accountId);
    allRecurring.push(...directDebits);

    // 3. Detect algorithmic patterns
    const algorithmicRecurring = await detectAlgorithmicRecurring(supabase, accountId);
    allRecurring.push(...algorithmicRecurring);

    // Save all detected recurring transactions
    const savedCount = await saveRecurringTransactions(supabase, allRecurring);
    
    return {
      success: true,
      installments: installments.length,
      directDebits: directDebits.length,
      algorithmicDetected: algorithmicRecurring.length,
      total: savedCount,
    };
  } catch (error) {
    logger.error('Error detecting recurring transactions', { account_id: accountId, error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main entry point
 */
async function main() {
  const accountId = process.env.ACCOUNT_ID;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  try {
    // If no specific account, run for all active accounts
    if (!accountId) {
      console.log('🔍 Running recurring detection for all accounts...');
      
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, bank_name')
        .eq('status', 'active');
      
      if (error) {
        // Handle case where table doesn't exist yet
        if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
          console.log('ℹ️ Database tables not set up yet. Please run database.sql in Supabase.');
          console.log('   No accounts to process - exiting successfully.');
          process.exit(0);
        }
        console.error(`Failed to fetch accounts: ${error.message}`);
        logger.error('Failed to fetch accounts', { error: error.message });
        process.exit(1);
      }

      if (!accounts || accounts.length === 0) {
        console.log('No active accounts found');
        process.exit(0);
      }

      console.log(`Found ${accounts.length} active account(s)`);
      let totalResults = { installments: 0, directDebits: 0, algorithmicDetected: 0, total: 0 };

      for (const account of accounts) {
        console.log(`\nProcessing account: ${account.bank_name} (${account.id})`);
        const result = await detectRecurringForAccount(supabase, account.id);
        
        if (result.success) {
          totalResults.installments += result.installments;
          totalResults.directDebits += result.directDebits;
          totalResults.algorithmicDetected += result.algorithmicDetected;
          totalResults.total += result.total;
        } else {
          console.error(`  ⚠️ Failed: ${result.error}`);
        }
      }

      console.log('\n✓ Recurring transaction detection completed for all accounts:');
      console.log(`  - Installments: ${totalResults.installments}`);
      console.log(`  - Direct Debits: ${totalResults.directDebits}`);
      console.log(`  - Algorithmic: ${totalResults.algorithmicDetected}`);
      console.log(`  - Total: ${totalResults.total}`);
      
    } else {
      // Run for specific account
      const result = await detectRecurringForAccount(supabase, accountId);
      
      if (!result.success) {
        console.error(`Failed to detect recurring transactions: ${result.error}`);
        process.exit(1);
      }

      console.log('✓ Recurring transaction detection completed:');
      console.log(`  - Installments: ${result.installments}`);
      console.log(`  - Direct Debits: ${result.directDebits}`);
      console.log(`  - Algorithmic: ${result.algorithmicDetected}`);
      console.log(`  - Total: ${result.total}`);
    }
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
    logger.error('Unexpected error in detectRecurring', { error: error.message });
    process.exit(1);
  }
}

export { detectRecurringForAccount };

main().catch(error => {
  console.error('Unexpected error:', error);
  logger.error('Unexpected error', { error: error.message });
  process.exit(1);
});
