/**
 * Node.js loader hook to patch Puppeteer before any module uses it
 * 
 * To use this:
 * node --loader ./src/loaders/puppeteerLoader.mjs src/scripts/testBankConnection.js
 */

export async function initialize() {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (isCI) {
    console.log('⚙️  Loader: Patching Puppeteer for CI/CD sandbox bypass');
    
    // Pre-set environment variables that Puppeteer respects
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
    process.env.CHROMIUM_FLAGS = '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu';
  }
}

export async function resolve(specifier, context, nextResolve) {
  // This hook doesn't modify resolution
  return nextResolve(specifier);
}

export async function getFormat(url, context, nextGetFormat) {
  // This hook doesn't modify format detection
  return nextGetFormat(url);
}

export async function getSource(url, context, nextGetSource) {
  // This hook doesn't modify source loading
  return nextGetSource(url);
}

export async function getGlobalPreloadCode() {
  // In ES module context, we can't use require() directly
  // Instead, we'll use dynamic import to patch Puppeteer after it's loaded
  return `
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    
    if (isCI && globalThis.__puppeteerPatched !== true) {
      globalThis.__puppeteerPatched = true;
      console.log('⚙️  Global preload: Preparing Puppeteer patch for sandbox bypass');
      
      // Patch using global import hook
      const origImport = globalThis.importModule || null;
      
      // We need to intercept the israelis bank scraper's internal Puppeteer usage
      // Since we can't reliably do this at the module level in ES modules,
      // we'll rely on the environment variables set in initialize()
      process.env.PUPPETEER_LAUNCH_ARGS = '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu';
    }
  `;
}
