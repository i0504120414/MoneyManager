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

// Scrape bank data
// @param {string} bank_type - Bank type
// @param {Record<string, string>} credentials - Bank login credentials
// @param {Date} startDate - Start date for transactions
// @returns {Promise<Object>} - Scrape result
export async function scrape(bank_type, credentials, startDate) {
  
  // Log scraping start
  logger(`Scraping data for bank: ${bank_type} starting from ${startDate.toISOString().split('T')[0]}`);

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
    storeFailureScreenShotPath: screenshotPath,
    // Callback for domain tracking and Cloudflare bypass
    onBrowserContextCreated: async (browserContext) => {
      logger(`[${bank_type}] Browser context created - initializing security layers...`);
      try {
        // Initialize request monitoring
        await initDomainTracking(browserContext, bank_type);
        logger(`[${bank_type}] Domain tracking initialized`);
        
        // Setup Cloudflare bypass for all pages in context
        browserContext.on('page', (page) => {
          setupCloudflareBypass(page);
        });
        logger(`[${bank_type}] Cloudflare bypass ready`);
      } catch (error) {
        logger(`[${bank_type}] Error initializing security: ${error.message}`);
      }
    }
  };

  const scraper = createScraper(scraperOptions);

  try {
    logger(`[${bank_type}] Starting scraper...`);
    const result = await scraper.scrape(credentials);
    logger(`✓ Scraping completed for bank: ${bank_type}`);
    logger('Scrape result:', {
      success: result.success,
      accountCount: result.accounts?.length || 0,
      errorType: result.errorType,
      errorMessage: result.errorMessage
    });
    
    // If scraper returned failure, log details
    if (!result.success) {
      logger(`[ERROR] Scraper reported failure:`);
      logger(`  Error Type: ${result.errorType}`);
      logger(`  Error Message: ${result.errorMessage}`);
    }
    
    return result;
  } catch (error) {
    logger(`✗ Scraping failed with exception: ${error.message}`);
    logger(`Stack: ${error.stack}`);
    // Check if screenshot was saved
    if (screenshotPath) {
      try {
        const exists = await fs.access(screenshotPath).then(() => true).catch(() => false);
        if (exists) {
          logger(`📸 Screenshot saved at: ${screenshotPath}`);
        }
      } catch (e) {
        // Ignore
      }
    }
    return { success: false, error: error.message };
  }
}
