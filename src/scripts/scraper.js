import { createScraper } from 'israeli-bank-scrapers';
import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { initDomainTracking } from '../security/domains.js';
import { setupCloudflareBypass } from '../scrapers/cloudflareSolver.js';

const logger = createLogger('scraper');

// Create screenshots directory if it doesn't exist
async function ensureScreenshotsDir() {
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
    return screenshotsDir;
  } catch (error) {
    logger('Failed to create screenshots directory:', error.message);
  }
  return null;
}

// Simple single-attempt scxxxxxxunction
// Retry logic has been moved to the visa-cal.ts patch to distinguish between
// API errors (worthy of retry) vs asset/CDN errors (should be ignored)
async function scrapeWithRetry(bank_type, credentials, startDate) {
  let scraper = null;
  
  try {
    logger(`Creating scraper instance for ${bank_type}...`);
    
    scraper = createScraper({
      companyId: bank_type,
      startDate: startDate,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
      viewportSize: { width: 1920, height: 1080 },
      navigationRetryCount: 20,
      verbose: true,
      onBrowserContextCreated: async (browserContext) => {
        logger(`[${bank_type}] Browser context created`);
        try {
          await initDomainTracking(browserContext, bank_type);
          browserContext.on('page', (page) => {
            setupCloudflareBypass(page);
          });
        } catch (error) {
          logger(`[${bank_type}] Security setup error: ${error.message}`);
        }
      }
    });
    
    logger(`Starting scrape...`);
    const result = await scraper.scrape(credentials);
    return result;
    
  } catch (error) {
    logger(`Scrape exception: ${error.message}`);
    return {
      success: false,
      accounts: [],
      errorType: 'SCRAPER_ERROR',
      errorMessage: error.message
    };
  } finally {
    if (scraper?.browser) {
      try {
        logger(`Closing browser...`);
        await scraper.browser.close();
      } catch (error) {
        logger(`Browser cleanup error: ${error.message}`);
      }
    }
  }
}

// Single scrape attempt (backward compatible)
async function scrapeOnce(bank_type, credentials, startDate) {
  logger(`Scraping data for bank: ${bank_type} starting from ${startDate.toISOString().split('T')[0]}`);

  const screenshotsDir = await ensureScreenshotsDir();
  const screenshotPath = screenshotsDir ? path.join(screenshotsDir, `${bank_type}_failure.png`) : undefined;

  const scraper = createScraper({
    companyId: bank_type,
    startDate: startDate,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
    viewportSize: { width: 1920, height: 1080 },
    navigationRetryCount: 20,
    verbose: true,
    storeFailureScreenShotPath: screenshotPath,
    onBrowserContextCreated: async (browserContext) => {
      logger(`[${bank_type}] Browser context created`);
      try {
        await initDomainTracking(browserContext, bank_type);
        browserContext.on('page', (page) => {
          setupCloudflareBypass(page);
        });
      } catch (error) {
        logger(`[${bank_type}] Security setup error: ${error.message}`);
      }
    }
  });

  try {
    logger(`[${bank_type}] Starting scraper...`);
    const result = await scraper.scrape(credentials);
    logger(` Scraping completed for bank: ${bank_type}`);
    logger('Scrape result:', {
      success: result.success,
      accountCount: result.accounts?.length || 0,
      errorType: result.errorType,
      errorMessage: result.errorMessage
    });
    
    if (!result.success) {
      logger(`[ERROR] Scraper reported failure:`);
      logger(`  Error Type: ${result.errorType}`);
      logger(`  Error Message: ${result.errorMessage}`);
    }
    
    return result;
  } catch (error) {
    logger(` Scraping failed with exception: ${error.message}`);
    logger(`Stack: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

// Exported function - now uses simple single-attempt scrape
// Retry logic has been moved to the visa-cal.ts patch to handle API vs asset errors properly
// @param {string} bank_type - Bank type
// @param {Record<string, string>} credentials - Bank login credentials
// @param {Date} startDate - Start date for transactions
// @returns {Promise<Object>} - Scrape result
export async function scrape(bank_type, credentials, startDate) {
  return scrapeWithRetry(bank_type, credentials, startDate);
}
