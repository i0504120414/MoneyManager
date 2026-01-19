import { createClient } from '@supabase/supabase-js';
import { scrape } from './scraper.js';
import { createLogger } from '../utils/logger.js';
import crypto from 'crypto';

const logger = createLogger('sync-all-accounts');

/**
 * Generate hash for transaction deduplication
 */
function generateTransactionHash(tx, accountId) {
  const hashInput = `${accountId}:${tx.date}:${tx.description}:${tx.chargedAmount || tx.originalAmount}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Get credentials from environment variables based on bank type
 */
function getCredentialsFromEnv(bankType) {
  const credentials = {};
  
  // Map environment variables to credential fields
  const envMapping = {
    userCode: process.env.USER_CODE,
    username: process.env.BANK_USERNAME,
    password: process.env.PASSWORD,
    id: process.env.ID,
    num: process.env.NUM,
    card6Digits: process.env.CARD_6_DIGITS,
    nationalID: process.env.NATIONAL_ID,
    email: process.env.EMAIL,
    phoneNumber: process.env.PHONE_NUMBER,
    otpCodeRetriever: process.env.OTP_CODE,
    otpLongTermToken: process.env.OTP_LONG_TERM_TOKEN,
  };

  for (const [key, value] of Object.entries(envMapping)) {
    if (value) {
      credentials[key] = value;
    }
  }

  return credentials;
}

async function syncAccount(supabase, userAccount, credentials) {
  const { id: userAccountId, bank_type: bankType } = userAccount;
  
  console.log(`\n🔄 Syncing account: ${userAccountId} (${bankType})`);
  logger.info('Starting sync for account', { userAccountId, bankType });

  // Calculate start date (30 days ago by default, or last_updated)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const startDate = userAccount.last_updated 
    ? new Date(Math.max(new Date(userAccount.last_updated).getTime(), thirtyDaysAgo.getTime()))
    : thirtyDaysAgo;

  console.log(`   Start date: ${startDate.toISOString().split('T')[0]}`);

  try {
    // Scrape transactions
    const result = await scrape(bankType, credentials, startDate);

    if (!result.success) {
      throw new Error(result.errorType || result.errorMessage || 'Scraping failed');
    }

    console.log(`   ✓ Scraped ${result.accounts.length} account(s)`);

    let totalTransactions = 0;
    let insertedTransactions = 0;
    let skippedTransactions = 0;

    // Process each bank account from scraping results
    for (const scrapedAccount of result.accounts) {
      const accountNumber = scrapedAccount.accountNumber || 'default';
      
      // Upsert bank_account
      const { data: bankAccount, error: bankAccountError } = await supabase
        .from('bank_accounts')
        .upsert({
          user_account_id: userAccountId,
          account_number: accountNumber,
          bank_type: bankType,
          balance: scrapedAccount.balance || null,
          is_active: true,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_account_id,account_number'
        })
        .select('id')
        .single();

      if (bankAccountError) {
        console.error(`   ❌ Failed to upsert bank account: ${bankAccountError.message}`);
        logger.error('Failed to upsert bank account', { error: bankAccountError.message, accountNumber });
        continue;
      }

      const bankAccountId = bankAccount.id;
      console.log(`   📊 Account ${accountNumber}: balance = ${scrapedAccount.balance || 'N/A'}`);

      // Process transactions
      if (scrapedAccount.txns && scrapedAccount.txns.length > 0) {
        totalTransactions += scrapedAccount.txns.length;

        for (const tx of scrapedAccount.txns) {
          const hash = generateTransactionHash(tx, bankAccountId);
          
          const transactionData = {
            account_id: bankAccountId,
            hash: hash,
            identifier: tx.identifier || null,
            date: tx.date,
            processed_date: tx.processedDate || null,
            original_amount: tx.originalAmount || 0,
            original_currency: tx.originalCurrency || 'ILS',
            charged_amount: tx.chargedAmount || 0,
            description: tx.description || '',
            memo: tx.memo || null,
            type: tx.type || 'normal',
            installment_number: tx.installments?.number || null,
            installment_total: tx.installments?.total || null,
          };

          const { error: txError } = await supabase
            .from('transactions')
            .insert([transactionData]);

          if (txError) {
            if (txError.code === '23505' || txError.message.includes('duplicate')) {
              skippedTransactions++;
            } else {
              logger.error('Failed to insert transaction', { error: txError.message, transaction: tx.description });
            }
          } else {
            insertedTransactions++;
          }
        }
      }
    }

    // Update last_updated on user account
    await supabase
      .from('bank_user_accounts')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', userAccountId);

    console.log(`   ✓ Transactions: ${insertedTransactions} new, ${skippedTransactions} duplicates skipped`);
    logger.info('Sync completed for account', { 
      userAccountId, 
      bankType,
      totalTransactions,
      insertedTransactions,
      skippedTransactions
    });

    return { success: true, inserted: insertedTransactions, skipped: skippedTransactions };
  } catch (error) {
    console.error(`   ❌ Sync failed: ${error.message}`);
    logger.error('Sync failed for account', { userAccountId, bankType, error: error.message });
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting sync for all accounts...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY are required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all user accounts
  const { data: userAccounts, error } = await supabase
    .from('bank_user_accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`❌ Failed to fetch user accounts: ${error.message}`);
    process.exit(1);
  }

  if (!userAccounts || userAccounts.length === 0) {
    console.log('⚠️ No user accounts found. Add an account first using the add-account workflow.');
    process.exit(0);
  }

  console.log(`📋 Found ${userAccounts.length} user account(s) to sync\n`);

  // Get credentials from environment
  const credentials = getCredentialsFromEnv();
  
  const results = {
    total: userAccounts.length,
    success: 0,
    failed: 0,
    details: []
  };

  // For now, we can only sync accounts that match the provided credentials
  // In a full implementation, credentials would be stored securely per account
  const bankType = process.env.BANK_TYPE;
  
  for (const userAccount of userAccounts) {
    // Only sync if bank type matches (when BANK_TYPE is provided)
    if (bankType && userAccount.bank_type !== bankType) {
      console.log(`⏭️ Skipping account ${userAccount.id} (${userAccount.bank_type}) - bank type mismatch`);
      continue;
    }

    const result = await syncAccount(supabase, userAccount, credentials);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }
    
    results.details.push({
      accountId: userAccount.id,
      bankType: userAccount.bank_type,
      ...result
    });
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total accounts: ${results.total}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log('='.repeat(50));

  // Write results to file for artifact upload
  const fs = await import('fs');
  fs.writeFileSync('sync-results.json', JSON.stringify(results, null, 2));
  console.log('\n✅ Results saved to sync-results.json');

  if (results.failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  logger.error('Fatal error in syncAllAccounts', { error: error.message });
  process.exit(1);
});
