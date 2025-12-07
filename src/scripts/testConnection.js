

import { SCRAPERS } from '../config/banks.js';
import fs from 'fs';
import { scrape } from './scraper.js';
import { createClient } from '@supabase/supabase-js';




async function main() {

  // Get bank type from environment variable
  const bankType = process.env.BANK_TYPE;
  
  // Validate bank type.
  if (!bankType || !SCRAPERS[bankType]) {
    console.error(`Invalid bank type: ${bankType}`);
    process.exit(1);
  }

  // Build credentials object from environment variables
  const credentials = buildCredentials(bankType);

  // Validate credentials
  if (Object.keys(credentials).length === 0) {
    console.error('No credentials provided');
    process.exit(1);
  }


  try {
  
    //set date to one month ago
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    console.log(`Testing connection for bank: ${bankType} from ${oneMonthAgo.toISOString().split('T')[0]}`);
    // Test connection
    const result = await scrape(bankType, credentials, oneMonthAgo);//this month
    const isConnected = result.accounts && result.accounts.length > 0;
    
    if (!isConnected) {
      console.error('Connection test failed');
      process.exit(1);
    }

    // Log connected accounts
    console.log(`✓ Successfully connected to ${SCRAPERS[bankType].name}`);
    console.log(`  Found ${result.accounts.length} account(s)`);
    
    result.accounts.forEach(account => {
      console.log(`    - Account ID: ${account.accountNumber || 'N/A'}, Balance: ${account.balance || 0}, Transactions: ${account.txns ? account.txns.length : 0}`);

    });



    //set supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Saving data to database...');
    // Save user account
    const { data, error } = await supabase
      .from('bank_user_accounts')
      .insert([
        {
          bank_type: bankType,
          credentials: credentials,
        }
      ])
      .select();
    
    let userAccountId;
    
    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`⚠ User account with this bank and credentials already exists. Using existing account.`);
        // Fetch the existing account
        const { data: existingAccount, error: fetchError } = await supabase
          .from('bank_user_accounts')
          .select('id')
          .eq('bank_type', bankType)
          .single();
        
        if (fetchError) {
          throw new Error(`Failed to retrieve existing user account: ${fetchError.message}`);
        }
        userAccountId = existingAccount.id;
      } else {
        throw new Error(`Failed to save user account: ${error.message}`);
      }
    } else {
      userAccountId = data[0].id;
      console.log(`✓ User account saved with ID: ${userAccountId}`);
    }

    // Save each bank account
    console.log('Saving bank accounts to database...');
    const accountsToInsert = result.accounts.map(account => ({
      user_account_id: userAccountId,
      account_number: account.accountNumber || '',
      bank_type: bankType,
      balance: account.balance || 0,
      is_active: true
    }));

    const {data: accountsData, error: accountsError} = await supabase
      .from('bank_accounts')
      .insert(accountsToInsert)
      .select();
    
    if (accountsError) {
      // Check if it's a duplicate key error
      if (accountsError.code === '23505' || accountsError.message.includes('duplicate')) {
        console.log(`⚠ Some accounts already exist. Updating existing accounts...`);
        
        // Update existing accounts with new balance
        for (const account of accountsToInsert) {
          const { error: updateError } = await supabase
            .from('bank_accounts')
            .update({
              balance: account.balance,
              last_updated: account.last_updated,
              is_active: true
            })
            .eq('user_account_id', userAccountId)
            .eq('account_number', account.account_number)
            .select();
          
          if (updateError) {
            console.log(`⚠ Failed to update account ${account.account_number}: ${updateError.message}`);
          }
        }
        console.log(`✓ Accounts updated with ${result.accounts.length} account(s)`);
      } else {
        throw new Error(`Failed to save bank accounts: ${accountsError.message}`);
      }
    } else {
      console.log(`✓ Bank accounts saved with ${accountsData.length} account(s)`);
    }


    // Save transactions
    console.log('Saving transactions to database...');
    const transactionsToInsert = [];
    
    // Create a map of account numbers to their Supabase IDs
    const accountMap = {};
    if (accountsData && accountsData.length > 0) {
      accountsData.forEach(acc => {
        accountMap[acc.account_number] = acc.id;
      });
    }

    for (const account of result.accounts) {
      if (account.txns && account.txns.length > 0) {
        const supabaseAccountId = accountMap[account.accountNumber];
        
        if (!supabaseAccountId) {
          console.log(`⚠ Could not find Supabase ID for account ${account.accountNumber}, skipping transactions`);
          continue;
        }

        const mappedTransactions = account.txns.map(tx => ({
          account_id: supabaseAccountId,
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
          status: tx.status || 'completed',
          created_at: new Date().toISOString()
        }));
        
        transactionsToInsert.push(...mappedTransactions);
      }
    }

    if (transactionsToInsert.length > 0) {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();
        
      if (transactionsError) {
        if (transactionsError.code === '23505' || transactionsError.message.includes('duplicate')) {
          console.log(`⚠ Some transactions already exist. Skipping duplicates.`);
        } else {
          throw new Error(`Failed to save transactions: ${transactionsError.message}`);
        }
      } else {
        console.log(`✓ Transactions saved: ${transactionsData.length} transaction(s)`);
      }
    } else {
      console.log(`ℹ No transactions to save`);
    }




  } catch (error) {

    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Build credentials object from environment variables based on bank type
 */
function buildCredentials(bankType) {
  const scraperConfig = SCRAPERS[bankType];
  const credentials = {};

  for (const field of scraperConfig.loginFields) {
    let envValue;

    // Map field names to environment variables
    switch (field) {
      case 'userCode':
        envValue = process.env.USER_CODE;
        break;
      case 'username':
        envValue = process.env.USERNAME;
        break;
      case 'id':
        envValue = process.env.ID;
        break;
      case 'password':
        envValue = process.env.PASSWORD;
        break;
      case 'num':
        envValue = process.env.NUM;
        break;
      case 'card6Digits':
        envValue = process.env.CARD_6_DIGITS;
        break;
      case 'nationalID':
        envValue = process.env.NATIONAL_ID;
        break;
      case 'email':
        envValue = process.env.EMAIL;
        break;
      case 'phoneNumber':
        envValue = process.env.PHONE_NUMBER;
        break;
      case 'otpCodeRetriever':
        envValue = process.env.OTP_CODE;
        break;
      case 'otpLongTermToken':
        envValue = process.env.OTP_LONG_TERM_TOKEN;
        break;
      default:
        console.warn(`Unknown field: ${field}`);
    }

    if (envValue) {
      credentials[field] = envValue;
    }
  }

  return credentials;
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
