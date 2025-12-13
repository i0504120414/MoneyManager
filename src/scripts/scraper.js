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

// KEY FIX: Create FRESH scraper instance for each retry attempt
// The israeli-bank-scrapers library internally manages browser lifecycle
// Reusing the same instance doesn't work because scraper.scrape() closes the browser
// Solution: Create new scraper per attempt, let each manage its own browser
async function scrapeWithRetry(bank_type, credentials, startDate, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let scraper = null;
    
    try {
      logger(`[Attempt ${attempt}/${maxRetries}] Creating fresh scraper instance for ${bank_type}...`);
      
      // Create FRESH scraper instance for this attempt
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
      
      logger(`[Attempt ${attempt}] Starting scrape with fresh browser...`);
      const result = await scraper.scrape(credentials);
      
      if (result.success) {
        logger(` [Attempt ${attempt}] Scrape succeeded`);
        return result;
      }
      
      // Check if error is transient
      if (result.errorMessage) {
        const errorMsg = result.errorMessage.toLowerCase();
        const isTransient = 
          errorMsg.includes('invalid json response body') ||
          errorMsg.includes('status code: 400') ||
          errorMsg.includes('status code: 429') ||
          errorMsg.includes('status code: 503') ||
          errorMsg.includes('waiting for selector');
        
        lastError = result;
        
        if (isTransient && attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 5000;
          logger(`[Retry] Transient error (${result.errorType}), waiting ${delayMs}ms before attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // Go to next iteration = fresh scraper instance
        }
      }
      
      // Non-transient error or last attempt
      logger(`[Attempt ${attempt}] Non-transient error, returning result`);
      return result;
      
    } catch (error) {
      logger(`[Attempt ${attempt}] Exception: ${error.message}`);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 5000;
        logger(`[Retry] Exception on attempt ${attempt}, waiting ${delayMs}ms before attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } finally {
      // Cleanup browser for THIS attempt
      if (scraper && scraper.browser) {
        try {
          logger(`[Attempt ${attempt}] Closing browser...`);
          await scraper.browser.close();
        } catch (error) {
          logger(`[Attempt ${attempt}] Cleanup error: ${error.message}`);
        }
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

// Exported function - uses retry logic with FRESH browser per attempt
// @param {string} bank_type - Bank type
// @param {Record<string, string>} credentials - Bank login credentials
// @param {Date} startDate - Start date for transactions
// @returns {Promise<Object>} - Scrape result
export async function scrape(bank_type, credentials, startDate) {
  return scrapeWithRetry(bank_type, credentials, startDate, 3);
}
