import { createScraper } from 'israeli-bank-scrapers';
import { promises as fs } from 'fs';
import path from 'path';

// Create screenshots directory if it doesn't exist
async function ensureScreenshotsDir() {
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
    return screenshotsDir;
  } catch (error) {
    console.error('Failed to create screenshots directory:', error.message);
  }
  return null;
}

// Scrape bank data
// @param {string} bank_type - Bank type
// @param {Record<string, string>} credentials - Bank login credentials
// @param {Date} startDate - Start date for transactions
// @returns {Promise<Object>} - Scrape result
export async function scrape(bank_type, credentials, startDate) {
  
  // Log scraping start
  console.log(`Scraping data for bank: ${bank_type} starting from ${startDate.toISOString().split('T')[0]}`);

  // Prepare screenshot directory
  const screenshotsDir = await ensureScreenshotsDir();
  const screenshotPath = screenshotsDir ? path.join(screenshotsDir, `${bank_type}_failure.png`) : undefined;

  const scraperOptions = {
    companyId: bank_type,
    startDate: startDate,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
    // Desktop viewport size to avoid mobile detection
    viewportSize: { width: 1920, height: 1080 },
    navigationRetryCount: 20,
    verbose: true,
    // Store screenshot if scraping fails
    storeFailureScreenShotPath: screenshotPath
    
  };

  const scraper = createScraper(scraperOptions);

  try {
    const result = await scraper.scrape(credentials);
    console.log(`✓ Scraping completed for bank: ${bank_type}`);
    console.log('Scrape result:', {
      success: result.success,
      accountCount: result.accounts?.length || 0,
      errorType: result.errorType,
      errorMessage: result.errorMessage
    });
    
    // If scraper returned failure, log details
    if (!result.success) {
      console.error(`[ERROR] Scraper reported failure:`);
      console.error(`  Error Type: ${result.errorType}`);
      console.error(`  Error Message: ${result.errorMessage}`);
    }
    
    return result;
  } catch (error) {
    console.error(`✗ Scraping failed with exception: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    // Check if screenshot was saved
    if (screenshotPath) {
      try {
        const exists = await fs.access(screenshotPath).then(() => true).catch(() => false);
        if (exists) {
          console.log(`📸 Screenshot saved at: ${screenshotPath}`);
        }
      } catch (e) {
        // Ignore
      }
    }
    return { success: false, error: error.message };
  }
}
