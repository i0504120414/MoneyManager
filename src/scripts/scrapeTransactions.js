import dotenv from 'dotenv';
import { scrapeTransactions } from '../services/scrapingService.js';
import fs from 'fs';

dotenv.config();

async function main() {
  const accountId = process.env.ACCOUNT_ID;
  const scrapingMode = process.env.SCRAPING_MODE || 'regular';
  const startDate = process.env.START_DATE;

  if (!accountId) {
    console.error('ACCOUNT_ID environment variable is required');
    process.exit(1);
  }

  console.log(`\n���� Starting transaction scraping...`);
  console.log(`   Account ID: ${accountId}`);
  console.log(`   Mode: ${scrapingMode}`);
  if (startDate) {
    console.log(`   Start Date: ${startDate}`);
  }

  try {
    const result = await scrapeTransactions(accountId, scrapingMode, startDate);

    const summary = {
      success: result.success,
      accountId,
      scrapingMode,
      ...(result.savedCount && { transactionsSaved: result.savedCount }),
      ...(result.error && { error: result.error }),
      completedAt: new Date().toISOString(),
    };

    fs.writeFileSync('scraping-results.json', JSON.stringify(summary, null, 2));

    if (result.success) {
      console.log(`\n��� Scraping completed successfully`);
      console.log(`   Transactions saved: ${result.savedCount}`);
    } else {
      console.log(`\n������ Scraping completed with issues: ${result.message || result.error}`);
    }

    console.log(JSON.stringify(summary, null, 2));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    const summary = {
      success: false,
      accountId,
      scrapingMode,
      error: error.message,
      completedAt: new Date().toISOString(),
    };

    fs.writeFileSync('scraping-results.json', JSON.stringify(summary, null, 2));
    console.error(`\n��� Scxxxxxxxxxxxed: ${error.message}`);
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
