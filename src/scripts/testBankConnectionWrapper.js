#!/usr/bin/env node

/**
 * Wrapper script for testBankConnection that ensures Puppeteer sandbox is disabled
 * This must be run before the main script loads
 */

// Set environment variables immediately before loading the main module
if (process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true') {
  console.log('⚙️  CI/CD environment detected - disabling Chromium sandbox');
  process.env.PUPPETEER_ARGS = '--no-sandbox --disable-setuid-sandbox';
}

// Import and run the test script
import('./testBankConnection.js').catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
