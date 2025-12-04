/**
 * Wrapper utilities for creating scrapers with proper sandbox configuration
 */

import pkg from 'israeli-bank-scrapers';
const { createScraper } = pkg;

/**
 * Create a scraper with sandbox-safe puppeteer configuration
 * @param {object} options - Scraper options
 * @returns {object} - Configured scraper
 */
export function createScraperWithSandboxFix(options) {
  // In CI/CD environments, ensure we disable sandbox
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (isCI) {
    // Add all possible puppeteer/browser launch arguments
    const enhancedOptions = {
      ...options,
      // Try different option names that libraries might support
      puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      },
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      launchConfig: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      },
      browser: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      },
    };
    
    console.log('🔧 Creating scraper with sandbox-safe configuration for CI/CD');
    return createScraper(enhancedOptions);
  }
  
  return createScraper(options);
}
