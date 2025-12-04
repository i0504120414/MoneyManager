/**
 * MUST BE IMPORTED FIRST - Before any other module that uses Puppeteer
 * This patches Puppeteer globally to disable sandbox in CI/CD environments
 */

// Detect CI/CD environment  
const isCI = process.env.CI === 'true' || 
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.PUPPETEER_ARGS?.includes('--no-sandbox');

if (isCI) {
  console.log('⚙️  Detected CI/CD environment - configuring Puppeteer sandbox bypass');
  
  // Set all relevant environment variables for puppeteer/chromium
  process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
  process.env.CHROMIUM_FLAGS = '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu';
  
  // Force puppeteer to use these args via environment variable that some versions respect
  process.env.BROWSER_ARGS = '--no-sandbox --disable-setuid-sandbox';
  
  // Try to patch before puppeteer is loaded using import.meta.resolve if available
  // But mainly, we'll patch when the services use createScraper
}
