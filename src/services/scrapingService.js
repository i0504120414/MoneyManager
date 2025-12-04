import pkg from 'israeli-bank-scrapers';
const { createScraper } = pkg;
import { supabase } from '../db/client.js';
import { v4 as uuidv4 } from 'uuid';
import { setupPuppeteerConfig } from '../utils/puppeteerConfig.js';

// Initialize puppeteer configuration for CI/CD environments
setupPuppeteerConfig();

/**
 * Scrape transactions from a bank account
 * @param {string} accountId - Account ID
 * @param {string} scrapingMode - Mode: 'regular', 'update', 'deep', 'custom'
 * @param {string} startDate - Optional custom start date (ISO format)
 * @returns {Promise<Object>} - Scraping results
 */
export async function scrapeTransactions(accountId, scrapingMode = 'regular', startDate = null) {
  try {
    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError) {
      throw new Error(`Account not found: ${accountError.message}`);
    }

    // Determine date range based on mode
    let scrapeStartDate;

    switch (scrapingMode) {
      case 'regular':
        // Last 3 months
        scrapeStartDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;

      case 'update':
        // Since last update
        scrapeStartDate = new Date(account.last_updated);
        break;

      case 'deep':
        // As far back as possible
        scrapeStartDate = new Date('2015-01-01');
        break;

      case 'custom':
        if (!startDate) {
          throw new Error('Custom mode requires a startDate');
        }
        scrapeStartDate = new Date(startDate);
        break;

      default:
        throw new Error(`Unknown scraping mode: ${scrapingMode}`);
    }

    console.log(`Scraping ${account.bank_type} (${scrapingMode}) from ${scrapeStartDate.toISOString()}`);

    // Initialize scraper with launch config for CI/CD environments (disable sandbox)
    const scraper = createScraper({
      companyId: account.bank_type,
      startDate: scrapeStartDate,
      launchConfig: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      ...account.credentials,
    });

    // Fetch transactions
    const result = await scraper.scrape();

    if (!result.accounts || result.accounts.length === 0) {
      console.log('No transactions found');
      return { success: false, message: 'No accounts found' };
    }

    // Save transactions to database
    let savedCount = 0;
    for (const bankAccount of result.accounts) {
      for (const transaction of bankAccount.txns || []) {
        await saveTransaction(accountId, transaction, result);
        savedCount++;
      }
    }

    // Update account's last_updated timestamp
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', accountId);

    if (updateError) {
      console.error(`Failed to update account timestamp: ${updateError.message}`);
    }

    console.log(`✓ Saved ${savedCount} transactions`);
    return { success: true, savedCount, scrapingMode };
  } catch (error) {
    console.error(`✗ Scraping failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Save a transaction to the database
 * @param {string} accountId - Account ID
 * @param {Object} transaction - Transaction object from scraper
 * @param {Object} scrapResult - Full scrape result
 */
async function saveTransaction(accountId, transaction, scrapResult) {
  const transactionId = uuidv4();

  const { error } = await supabase
    .from('transactions')
    .insert([
      {
        id: transactionId,
        account_id: accountId,
        date: transaction.date?.toISOString() || new Date().toISOString(),
        description: transaction.description || 'Unknown',
        amount: transaction.amount || 0,
        type: transaction.amount >= 0 ? 'credit' : 'debit',
        raw_data: transaction,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    console.error(`Failed to save transaction: ${error.message}`);
  }
}

/**
 * Get transactions for an account
 * @param {string} accountId - Account ID
 * @param {string} startDate - Optional start date filter
 * @param {string} endDate - Optional end date filter
 * @returns {Promise<Array>} - Transactions
 */
export async function getTransactions(accountId, startDate = null, endDate = null) {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId);

  if (startDate) {
    query = query.gte('date', startDate);
  }

  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get transactions: ${error.message}`);
  }

  return data;
}
