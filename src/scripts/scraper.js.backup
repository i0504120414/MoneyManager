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

// KEY FIX: Reuse same browser instance across retries to preserve session state, cookies, and auth headers
// This prevents HTTP 400 errors that occur when creating new browser instances with lost session
async function scrapeWithRetry(bank_type, credentials, startDate, maxRetries = 3) {
  let lastError = null;
  let scraper = null;
  
  try {
    // Create scraper ONCE - will reuse for all retry attempts
    logger(`[Setup] Creating scraper instance for ${bank_type}...`);
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
    
    // Retry scraping with SAME browser instance (preserves cookies/session)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger(`[Attempt ${attempt}/${maxRetries}] Scraping ${bank_type} with same browser context...`);
        const result = await scraper.scrape(credentials);
        
        if (result.success) {
          logger(`✓ [Attempt ${attempt}] Scrape succeeded`);
          return result;
        }
        
        // Check if error is transient
        if (result.errorMessage) {
          const errorMsg = result.errorMessage.toLowerCase();
          const isTransient = 
            errorMsg.includes('invalid json response body') ||
            errorMsg.includes('status code: 400') ||
            errorMsg.includes('status code: 429') ||
            errorMsg.includes('status code: 503');
          
          if (isTransient && attempt < maxRetries) {
            lastError = result;
            const delayMs = Math.pow(2, attempt) * 5000;
            logger(`[Retry] Transient error (${result.errorType}), waiting ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }
        
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 5000;
          logger(`[Retry] Attempt ${attempt} error: ${error.message}, waiting ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // All retries exhausted
    logger(`[ERROR] All ${maxRetries} attempts failed`);
    if (lastError && lastError.errorMessage) {
      return lastError;
    }
    return {
      success: false,
      accounts: [],
      errorType: 'RETRY_EXHAUSTED',
      errorMessage: `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown'}`
    };
    
  } finally {
    // Cleanup browser
    if (scraper && scraper.browser) {
      try {
        logger('[Cleanup] Closing browser...');
        await scraper.browser.close();
      } catch (error) {
        logger(`[Cleanup] Error: ${error.message}`);
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
    logger(`✓ Scraping completed for bank: ${bank_type}`);
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
    logger(`✗ Scraping failed with exception: ${error.message}`);
    logger(`Stack: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

// Exported function - uses retry logic with REUSED browser context
// @param {string} bank_type - Bank type
// @param {Record<string, string>} credentials - Bank login credentials
// @param {Date} startDate - Start date for transactions
// @returns {Promise<Object>} - Scrape result
export async function scrape(bank_type, credentials, startDate) {
  return scrapeWithRetry(bank_type, credentials, startDate, 3);
}
