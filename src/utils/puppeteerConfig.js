/**
 * Puppeteer configuration for CI/CD environments
 * Disables sandbox when running in headless environments like GitHub Actions
 */

/**
 * Check if running in a CI/CD environment
 * @returns {boolean}
 */
function isCI() {
  return process.env.CI === 'true' || 
         process.env.GITHUB_ACTIONS === 'true' || 
         process.env.PUPPETEER_ARGS?.includes('--no-sandbox');
}

/**
 * Get launch arguments for Puppeteer based on environment
 * @returns {string[]}
 */
export function getLaunchArgs() {
  const baseArgs = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ];

  if (isCI()) {
    baseArgs.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  return baseArgs;
}

/**
 * Get full launch config for Puppeteer
 * @returns {object}
 */
export function getLaunchConfig() {
  return {
    args: getLaunchArgs(),
    headless: true,
  };
}

/**
 * Setup environment variables for Puppeteer
 * This ensures sandbox is disabled in CI/CD environments
 */
export function setupPuppeteerConfig() {
  if (isCI()) {
    // Set environment variables that Puppeteer respects
    process.env.PUPPETEER_ARGS = '--no-sandbox --disable-setuid-sandbox';
    
    // Try to patch the launch method if puppeteer is already loaded
    try {
      const puppeteer = require('puppeteer');
      if (puppeteer && puppeteer.launch) {
        const originalLaunch = puppeteer.launch.bind(puppeteer);
        
        puppeteer.launch = async function(options = {}) {
          const config = getLaunchConfig();
          const mergedOptions = {
            ...config,
            ...options,
            args: [
              ...new Set([...(config.args || []), ...(options.args || [])]),
            ],
          };
          
          console.log('Launching browser with args:', mergedOptions.args);
          return originalLaunch(mergedOptions);
        };
      }
    } catch (e) {
      // Puppeteer not yet loaded, that's ok
    }
  }
}
