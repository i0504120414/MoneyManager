

import { SCRAPERS } from '../config/banks.js';
import fs from 'fs';
import { createScraper } from 'israeli-bank-scrapers';




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
    const scraperOptions = {
      companyId: bankType,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      args: ["--disable-dev-shm-usage", "--no-sandbox"]
    };
    const scraper = createScraper(scraperOptions);
    const result = await scraper.scrape(credentials);
    const isConnected = result.accounts && result.accounts.length > 0;
    
    if (!isConnected) {
      console.error('Connection test failed');
      process.exit(1);
    }

    // Add account to database
  //  const accountId = await addBankAccount(bankType, credentials);

    // Save summary
    const summary = {
      success: true,
      //accountId,
      bankType,
      bankName: SCRAPERS[bankType].name,
      createdAt: new Date().toISOString(),
      //message: `Account successfully created with ID: ${accountId}`,
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
