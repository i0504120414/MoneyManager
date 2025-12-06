

import { SCRAPERS } from '../config/banks.js';
import { createScraper } from 'israeli-bank-scrapers';
import fs from 'fs';
import { scrape } from './scraper.js';
import { createClient } from '@supabase/supabase-js'




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
  
    // Test connection
    const result = await scrape(bankType, credentials, new Date(Date.now()));
    const isConnected = result.accounts && result.accounts.length > 0;
    
    if (!isConnected) {
      console.error('Connection test failed');
      process.exit(1);
    }

    // Log connected accounts
    console.log(`✓ Successfully connected to ${SCRAPERS[bankType].name}`);
    console.log(`  Found ${result.accounts.length} account(s)`);
    
    //save user account info
    const userAccount = [bankType, credentials];
    //save connected accounts info
    const accountList = [];
    for (const account of result.accounts) {
        accountList.push({ id: account.id, maskedId: account.maskedId || '' });
        console.log(`    - Account ID: ${account.id}, Masked ID: ${account.maskedId || 'N/A'}`);
    }

    //save to supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Save user account
    let { data, error } = await supabase
      .from('bank_user_accounts')
      .insert([
        {
          bank_type: bankType,
          credentials: credentials,
          created_at: new Date().toISOString(),
          is_active: true
        }
      ]);
    if (error) {
      throw new Error(`Failed to save user account: ${error.message}`);
    }
    console.log(`✓ User account saved with ID: ${data[0].id}`);

    for (const account of result.accounts) {
        let { data: accountsData, error: accountsError } = await supabase
      .from('bank_accounts')
      .insert([
        {
          user_account_id: data[0].id,
          account_number: account.maskedId || '',
          account_name: account.accountName || '',
          bank_type: bankType,
          balance: account.balance || 0,
          currency: account.currency || 'ILS',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          is_active: true
        }
      ]);
    if (accountsError) {
      throw new Error(`Failed to save bank accounts: ${accountsError.message}`);
    }
    }
  

    // Save summary
    const summary = {
      success: true,
      bankType,
      bankName: SCRAPERS[bankType].name,
      createdAt: new Date().toISOString(),
      message: `Account is connected successfully`,
    };

    fs.writeFileSync('account-summary.json', JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));

  } catch (error) {
    const summary = {
      success: false,
      error: error.message,
      bankType,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync('account-summary.json', JSON.stringify(summary, null, 2));
    console.error(JSON.stringify(summary, null, 2));
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
