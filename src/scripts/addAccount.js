

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

  

    // Save data to database
    try {   
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
    
    
    
    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`⚠ User account with this bank and credentials already exists.`);
        process.exit(0);
      }
        throw new Error(`Failed to save user account: ${error.message}`);
        process.exit(1);
      
    } 
    
    let userAccountId;
    userAccountId = data[0].id;
    console.log(`✓ User account saved with ID: ${userAccountId}`);
   


   


  } catch (error) {

    console.error(`✗ failed to save data: ${error.message}`);
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
