

import { SCRAPERS } from '../config/banks.js';
import { scrape } from './scraper.js';

// Logger utility with timestamps
function createLogger(context) {
  return (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const dataStr = Object.keys(data).length > 0 ? ` | ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] [${context}] ${message}${dataStr}`);
  };
}

async function main() {
  const logger = createLogger('TestConnection');
  const startTime = Date.now();

  try {
    logger('About to start test');

    // Get bank type from environment variable
    const bankType = process.env.BANK_TYPE;
    
    // Validate bank type
    if (!bankType || !SCRAPERS[bankType]) {
      logger('Error: Invalid bank type', { bankType, validTypes: Object.keys(SCRAPERS) });
      process.exit(1);
    }

    logger('Bank type validated', { bankType, bankName: SCRAPERS[bankType].name });

    // Build credentials object from environment variables
    const credentials = buildCredentials(bankType);

    // Validate credentials
    if (Object.keys(credentials).length === 0) {
      logger('Error: No credentials provided', { requiredFields: SCRAPERS[bankType].loginFields });
      process.exit(1);
    }

    logger('Credentials loaded', { 
      providedFields: Object.keys(credentials),
      requiredFields: SCRAPERS[bankType].loginFields 
    });

    // Calculate date range
    const today = new Date();
    const monthsBack = parseInt(process.env.MONTHS_BACK || '1', 10);
    const startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack, today.getDate());
    const dateRange = `${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`;
    
    logger('Starting scrape', { 
      bankType, 
      dateRange,
      monthsBack 
    });

    // Run scraper
    const result = await scrape(bankType, credentials, startDate);
    
    logger('Scrape completed', { 
      success: result.success,
      accountsFound: result.accounts?.length || 0,
      errorType: result.errorType,
      errorMessage: result.errorMessage,
      elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
    });

    // Check if scraper returned an error
    if (!result.success) {
      logger('Error: Scraper returned failure', {
        errorType: result.errorType,
        errorMessage: result.errorMessage
      });
      
      // Provide helpful error messages
      if (result.errorType === 'INVALID_CREDENTIALS') {
        logger('⚠️  Invalid credentials - please check your username and password');
      } else if (result.errorMessage?.includes('invalid json')) {
        logger('⚠️  API returned invalid response - may be authentication issue or service error');
      } else if (result.errorMessage?.includes('timeout')) {
        logger('⚠️  Request timeout - service may be slow or unavailable');
      }
      
      process.exit(1);
    }

    // Validate results
    const isConnected = result.accounts && result.accounts.length > 0;
    
    if (!isConnected) {
      logger('Error: No accounts found in response');
      process.exit(1);
    }

    // Log connected accounts
    logger(`✓ Successfully connected to ${SCRAPERS[bankType].name}`, { 
      accountCount: result.accounts.length 
    });
    
    result.accounts.forEach((account, index) => {
      const txnCount = account.txns ? account.txns.length : 0;
      logger(`Account ${index + 1}`, {
        accountNumber: account.accountNumber || 'N/A',
        accountType: account.type || 'N/A',
        balance: account.balance || 0,
        transactions: txnCount,
        currency: account.currency || 'ILS'
      });
    });

    logger('Connection test completed successfully', { 
      totalTime: Math.round((Date.now() - startTime) / 1000) + 's'
    });
    process.exit(0);

  } catch (error) {
    logger('Error during scrape', {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
      elapsedSeconds: Math.round((Date.now() - startTime) / 1000)
    });
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
