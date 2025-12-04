/**
 * Initialize Puppeteer patches before any module loading
 * This must be imported FIRST in the main script
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { registerModule } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set Puppeteer-related environment variables for CI/CD
if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  console.log('⚙️  Setting up Puppeteer for CI/CD (sandbox disabled)');
  
  // These environment variables instruct Puppeteer to use CI-friendly settings
  process.env.PUPPETEER_SKIP_DOWNLOAD = 'false';
  process.env.PUPPETEER_PRODUCT = 'chrome';
  
  // Use browserless or add args via the scraperFactory
}

export default {};
