

import { SCRAPERS } from '../config/banks.js';
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

  // Test connection
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
    } catch (error) {

    console.error(`✗ failed to connect: ${error.message}`);
    process.exit(1);
  }

   console.log('Connection test completed successfully');
   process.exit(0);
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
