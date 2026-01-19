
import { getAccountDetails , getAccountChildren} from "./listAccounts.js";
import { scrape } from "./scraper.js";
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scrape-transactions');

/**
 * Generate hash for transaction deduplication
 */
function generateTransactionHash(tx, accountId) {
  const hashInput = `${accountId}:${tx.date}:${tx.description}:${tx.chargedAmount || tx.originalAmount}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

async function main() {

  const accountId = process.env.ACCOUNT_ID;
  const scrapingMode = process.env.SCRAPING_MODE || 'update';
  let startDate = process.env.START_DATE;
  
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  if (!accountId) {
    console.error('ACCOUNT_ID environment variable is required');
    process.exit(1);
  }


  console.log(`Starting transaction scraping...`);
  console.log(`   Account ID: ${accountId}`);
  console.log(`   Mode: ${scrapingMode}`);
  
  if (scrapingMode === 'regular' && !startDate) {
    console.error('START_DATE environment variable is required for regular scraping mode');
    process.exit(1);
  }

  if (scrapingMode === 'regular' && startDate) {
    console.log(`   Start Date: ${startDate}`);
  }

  if (scrapingMode === 'max') {
    // Default to 30 days ago if no last scrape date
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  }

  if (scrapingMode === 'update') {
    startDate =  await getAccountDetails().then(details => {
      const lastScrape = details.last_scraped_at;
      if (lastScrape) {
        return new Date(lastScrape);
      } else {
        // Default to 30 days ago if no last scrape date
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      }
    });
  }


  const accountDetails = await getAccountDetails();
  const credentials = accountDetails.credentials;
  const bankType = accountDetails.bank_type;

  try {
    const result = await scrape(bankType, credentials, startDate);

    console.log('result status:', result.success);
    if(!result.success) {
      throw new Error(result.error || 'Scraping failed without a specific error message');
      process.exit(1);
    }

    
    const tnxsList = [];
    for (const acc of result.accounts) {

      console.log(`Processing account: ${acc.accountNumber || 'N/A' } with ${acc.txns ? acc.txns.length : 0} transaction(s)`);
      const {data: accountData, error :accountError} = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_account_id', accountId)
      .eq('account_number', acc.accountNumber)
      .single();
      if (accountError) {
        throw new Error(`Failed to fetch bank account for transactions: ${accountError.message}`);
      }
      console.log('accountData:', accountData);
      console.log(`Mapped to bank_accounts ID: ${accountData.id}`);
      console.log(`Found ${acc.txns ? acc.txns.length : 0} transaction(s) for this account`);
      if (acc.txns ) {
          tnxsList.push(...acc.txns.map(tx => {
            const hash = generateTransactionHash(tx, accountData.id);
            return {
              account_id: accountData.id,
              hash: hash,
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
            };
          }));
      }
    }


    console.log('✓ Scraping completed successfully');
    console.log(`found ${tnxsList.length} transaction(s)`);
    
    
    // Save transactions to database (with deduplication by hash)
    console.log('Saving transactions to database...');
    
    if (tnxsList.length > 0) {
      let insertedCount = 0;
      let skippedCount = 0;

      for (const tx of tnxsList) {
        const { error } = await supabase
          .from('transactions')
          .insert([tx]);
        
        if (error) {
          if (error.code === '23505' || error.message.includes('duplicate')) {
            skippedCount++;
          } else {
            logger.error('Failed to save transaction', { transaction: tx, error: error.message });
            throw new Error(`Failed to save transactions: ${error.message}`);
          }
        } else {
          insertedCount++;
        }
      }
      
      console.log(`✓ Transactions saved: ${insertedCount} new transaction(s), ${skippedCount} duplicate(s) skipped`);
      logger.info('Transactions synchronized', { 
        account_id: accountId,
        inserted: insertedCount,
        skipped: skippedCount,
        total: tnxsList.length
      });
    }
    console.log(`${tnxsList.length} transactions processed successfully` );

    // Update last_updated in bank_accounts
    const { data: updateData, error: updateError } = await supabase
      .from('bank_accounts')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', accountId);

    if (updateError) {
      throw new Error(`Failed to update last_updated: ${updateError.message}`);
      process.exit(1);
    }
    console.log('✓ last_updated timestamp updated successfully');


   
  
  } catch (error) {
   
    console.error(`Scraping failed: ${error.message}`);
    logger.error('Scraping failed', { account_id: accountId, error: error.message });
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  logger.error('Unexpected error in scrapeTransactions', { error: error.message });
  process.exit(1);
});









