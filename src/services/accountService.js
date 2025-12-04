// MUST COME FIRST - Patches Puppeteer to disable sandbox in CI/CD
import '../patches/puppeteerPatch.js';

import { createScraperWithSandboxFix } from './scraperFactory.js';
import { supabase } from '../db/client.js';
import { v4 as uuidv4 } from 'uuid';
import { SCRAPERS } from '../config/banks.js';
import { setupPuppeteerConfig } from '../utils/puppeteerConfig.js';

// Initialize puppeteer configuration for CI/CD environments
setupPuppeteerConfig();

/**
 * Test bank connection and validate credentials
 * @param {string} bankType - Type of bank (e.g., 'hapoalim')
 * @param {Record<string, string>} credentials - Bank login credentials
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function testBankConnection(bankType, credentials) {
  try {
    console.log(`Testing connection to ${SCRAPERS[bankType]?.name || bankType}...`);
    
    // Ensure sandbox is disabled in CI/CD environments
    if (process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true') {
      process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
    }
    
    // Initialize scraper with sandbox-safe configuration
    const scraper = createScraperWithSandboxFix({
      companyId: bankType,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      ...credentials,
    });

    console.log(scraper);

    // Try to fetch accounts
    const result = await scraper.scrape();
    console.log(result.data);
    
    if (result.accounts && result.accounts.length > 0) {
      console.log(`✓ Successfully connected to ${SCRAPERS[bankType]?.name}`);
      console.log(`  Found ${result.accounts.length} account(s)`);
      return true;
    } else {
      console.log(`✗ No accounts found for ${SCRAPERS[bankType]?.name}`
        ,result.error
      );
      return false;
    }
  } catch (error) {
    console.error(`✗ Connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Add a new bank account to the database
 * @param {string} bankType - Type of bank
 * @param {Record<string, string>} credentials - Bank login credentials
 * @returns {Promise<string>} - Account ID
 */
export async function addBankAccount(bankType, credentials) {
  const accountId = uuidv4();
  
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert([
      {
        id: accountId,
        bank_type: bankType,
        credentials: credentials, // Should be encrypted in production
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true,
      },
    ])
    .select();

  if (error) {
    throw new Error(`Failed to add account: ${error.message}`);
  }

  console.log(`✓ Account created with ID: ${accountId}`);
  return accountId;
}

/**
 * Get account details from database
 * @param {string} accountId - Account ID
 * @returns {Promise<BankAccount>} - Account details
 */
export async function getAccountDetails(accountId) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) {
    throw new Error(`Account not found: ${error.message}`);
  }

  return data;
}

/**
 * List all bank accounts
 * @returns {Promise<BankAccount[]>} - All accounts
 */
export async function listAccounts() {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to list accounts: ${error.message}`);
  }

  return data;
}
