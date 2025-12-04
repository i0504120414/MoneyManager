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
  // In CI/CD environments, add puppeteer launch args
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (isCI) {
    // The library may not support all these, so we just pass what might work
    // and let it handle what it doesn't understand
    const sandboxArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    
    const enhancedOptions = {
      ...options,
      launchConfig: {
        args: sandboxArgs,
      },
    };
    
    console.log('🔧 Creating scraper with sandbox-safe configuration for CI/CD');
    return createScraper(enhancedOptions);
  }
  
  return createScraper(options);
}
