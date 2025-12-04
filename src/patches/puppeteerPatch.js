/**
 * MUST BE IMPORTED FIRST - Before any other module that uses Puppeteer
 * This patches Puppeteer globally to disable sandbox in CI/CD environments
 * 
 * Works by setting environment variables that Puppeteer respects
 */

// Detect CI/CD environment
const isCI = process.env.CI === 'true' || 
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.PUPPETEER_ARGS?.includes('--no-sandbox');

if (isCI) {
  console.log('⚙️  Detected CI/CD environment - configuring Puppeteer for sandbox-less mode');
  
  // Set environment variables that tell Puppeteer/Chromium to skip sandbox
  process.env.PUPPETEER_ARGS = '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu';
  process.env.CHROMIUM_FLAGS = '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu';
  
  // Also try to hook into global fetch/import to patch puppeteer when it loads
  const originalFetch = global.fetch;
  const patchedModules = new Map();
  
  // Store reference to patch puppeteer if it gets imported later
  global.__puppeteerPatched = false;
  
  // Helper function to patch a puppeteer-like object
  global.__patchPuppeteer = function(puppeteerModule) {
    if (global.__puppeteerPatched || !puppeteerModule) return;
    
    if (typeof puppeteerModule.launch === 'function') {
      const originalLaunch = puppeteerModule.launch;
      console.log('🔧 Found and patching Puppeteer.launch()');
      
      puppeteerModule.launch = async function(options = {}) {
        const patchedOptions = {
          ...options,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            ...(options.args || []),
          ],
        };
        
        // Remove duplicates
        patchedOptions.args = [...new Set(patchedOptions.args)];
        console.log('📋 Launching Puppeteer with args:', patchedOptions.args);
        
        return originalLaunch.call(this, patchedOptions);
      };
      
      global.__puppeteerPatched = true;
    }
  };
}
