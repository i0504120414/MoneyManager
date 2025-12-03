import dotenv from 'dotenv';
import { testBankConnection } from '../services/accountService.js';
import { SCRAPERS } from '../config/banks.js';
import fs from 'fs';

dotenv.config();

async function main() {
  const bankType = process.env.BANK_TYPE;
  
  if (!bankType || !SCRAPERS[bankType]) {
    console.error(`Invalid bank type: ${bankType}`);
    process.exit(1);
  }

  // Build credentials object from environment variables
  const credentials = buildCredentials(bankType);

  if (Object.keys(credentials).length === 0) {
    console.error('No credentials provided');
    process.exit(1);
  }

  try {
    // Test connection
    console.log(`\n🔍 Testing connection to ${SCRAPERS[bankType].name}...`);
    const isConnected = await testBankConnection(bankType, credentials);
    
    const result = {
      bankType,
      bankName: SCRAPERS[bankType].name,
      connected: isConnected,
      testedAt: new Date().toISOString(),
      requiredFields: SCRAPERS[bankType].loginFields,
      providedFields: Object.keys(credentials),
    };

    console.log('\n📋 Test Result:');
    console.log(JSON.stringify(result, null, 2));

    if (!isConnected) {
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
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
