/**
 * Puppeteer configuration for CI/CD environments
 * Disables sandbox when running in headless environments like GitHub Actions
 */

import puppeteer from 'puppeteer';

/**
 * Check if running in a CI/CD environment
 * @returns {boolean}
 */
function isCI() {
  return process.env.CI === 'true' || 
         process.env.GITHUB_ACTIONS === 'true' || 
         process.env.PUPPETEER_ARGS === '--no-sandbox --disable-setuid-sandbox';
}

/**
 * Get launch arguments for Puppeteer based on environment
 * @returns {string[]}
 */
export function getLaunchArgs() {
  const baseArgs = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
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
 * Override Puppeteer's launch method to inject our config
 */
export function setupPuppeteerConfig() {
  const originalLaunch = puppeteer.launch.bind(puppeteer);
  
  puppeteer.launch = async function(options = {}) {
    const config = getLaunchConfig();
    const mergedOptions = {
      ...config,
      ...options,
      args: [
        ...new Set([...config.args, ...(options.args || [])]),
      ],
    };
    
    return originalLaunch(mergedOptions);
  };
}
