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
    // The library accepts 'args' directly in DefaultBrowserOptions
    const sandboxArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    
    const enhancedOptions = {
      ...options,
      // Pass args directly - this is the correct way per TypeScript definitions
      args: [...(options.args || []), ...sandboxArgs],
    };
    
    console.log('🔧 Creating scraper with sandbox-safe configuration for CI/CD');
    console.log('🔧 Browser args:', enhancedOptions.args);
    return createScraper(enhancedOptions);
  }
  
  return createScraper(options);
}
