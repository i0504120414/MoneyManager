/**
 * MUST BE IMPORTED FIRST - Before any other module that uses Puppeteer
 * This patches Puppeteer globally to disable sandbox in CI/CD environments
 */

// Detect CI/CD environment
const isCI = process.env.CI === 'true' || 
             process.env.GITHUB_ACTIONS === 'true' ||
             process.env.PUPPETEER_ARGS?.includes('--no-sandbox');

if (isCI) {
  console.log('⚙️  Detected CI/CD environment - patching Puppeteer to disable sandbox...');
  
  // Use Module.prototype.require to intercept require calls
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    const module = originalRequire.apply(this, arguments);
    
    // Patch puppeteer when it's loaded
    if (id === 'puppeteer' || id === 'puppeteer-core' || id.includes('puppeteer')) {
      if (module && typeof module.launch === 'function') {
        const originalLaunch = module.launch;
        
        module.launch = async function(options = {}) {
          console.log('🔧 Puppeteer.launch() called - injecting sandbox-disable args');
          
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
          
          console.log('📋 Final launch args:', patchedOptions.args);
          
          return originalLaunch.call(this, patchedOptions);
        };
        
        // Copy static methods
        Object.assign(module.launch, originalLaunch);
      }
    }
    
    return module;
  };
}
