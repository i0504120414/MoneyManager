

import { SCRAPERS } from '../config/banks.js';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('add-account');

/**
 * Save credentials to GitHub Secrets via API
 * Requires GITHUB_TOKEN environment variable
 */
async function saveCredentialsToGitHubSecret(accountId, credentials) {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.warn('⚠ GITHUB_TOKEN not provided. Credentials will not be saved to GitHub Secrets.');
    logger.warn('GitHub token not available', { account_id: accountId });
    return null;
  }

  try {
    // Extract repo info from environment or use defaults
    const repo = process.env.GITHUB_REPOSITORY || 'owner/repo';
    const [owner, repoName] = repo.split('/');
    
    // Create secret name based on account ID
    const secretName = `ACC_${accountId.toUpperCase().slice(0, 8)}`;
    
    // Encrypt credentials as JSON
    const credentialsJson = JSON.stringify(credentials);
    
    // Use GitHub API to create/update secret
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/actions/secrets/${secretName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_value: credentialsJson,
          visibility: 'private'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    console.log(`✓ Credentials saved to GitHub Secret: ${secretName}`);
    logger.info('Credentials saved to GitHub Secrets', { account_id: accountId, secret_name: secretName });
    return secretName;
  } catch (error) {
    console.warn(`⚠ Failed to save credentials to GitHub: ${error.message}`);
    logger.error('Failed to save to GitHub Secrets', { account_id: accountId, error: error.message });
    return null;
  }
}

async function main() {

  // Get bank type from environment variable
  const bankType = process.env.BANK_TYPE;
  
  // Validate bank type.
  if (!bankType || !SCRAPERS[bankType]) {
    console.error(`Invalid bank type: ${bankType}`);
    logger.error('Invalid bank type', { bank_type: bankType });
    process.exit(1);
  }

  // Build credentials object from environment variables
  const credentials = buildCredentials(bankType);

  // Validate credentials
  if (Object.keys(credentials).length === 0) {
    console.error('No credentials provided');
    logger.error('No credentials provided', { bank_type: bankType });
    process.exit(1);
  }

  

    // Save data to database
    try {   
    //set supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Saving data to database...');
    // Save user account WITH credentials (encrypted in Supabase)
    const { data, error } = await supabase
      .from('bank_user_accounts')
      .insert([
        {
          bank_type: bankType,
          credentials: credentials, // Store credentials in database - Supabase encrypts at rest
        }
      ])
      .select();
    
    
    
    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`⚠ User account with this bank already exists.`);
        logger.warn('Duplicate account', { bank_type: bankType });
        process.exit(0);
      }
        throw new Error(`Failed to save user account: ${error.message}`);
        process.exit(1);
      
    } 
    
    let userAccountId;
    userAccountId = data[0].id;
    console.log(`✓ User account saved with ID: ${userAccountId}`);
    logger.info('User account created', { account_id: userAccountId, bank_type: bankType });
   
    // Save credentials to GitHub Secrets
    const secretName = await saveCredentialsToGitHubSecret(userAccountId, credentials);
    
    // Log the secret name in the database for reference
    if (secretName) {
      const { error: updateError } = await supabase
        .from('bank_user_accounts')
        .update({ credentials: { github_secret_name: secretName } })
        .eq('id', userAccountId);
      
      if (updateError) {
        console.warn(`⚠ Could not update secret reference in database: ${updateError.message}`);
        logger.warn('Could not update secret reference', { account_id: userAccountId, error: updateError.message });
      }
    }


  } catch (error) {

    console.error(`✗ failed to save data: ${error.message}`);
    logger.error('Failed to add account', { error: error.message });
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
        envValue = process.env.BANK_USERNAME || process.env.USERNAME;
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
    } else {
      console.warn(`⚠️ Missing required field: ${field} for ${bankType}`);
    }
  }

  return credentials;
}

main().catch(error => {
  console.error('Unexpected error:', error);
  logger.error('Unexpected error in addAccount', { error: error.message });
  process.exit(1);
});
