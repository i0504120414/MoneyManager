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
    
    // Pre-set environment variables
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
  }
}

export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier);
}

export async function getFormat(url, context, nextGetFormat) {
  return nextGetFormat(url);
}

export async function getSource(url, context, nextGetSource) {
  return nextGetSource(url);
}

export async function getGlobalPreloadCode() {
  return `
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    
    if (isCI) {
      // Monkey-patch the puppeteer launch before it's used
      globalThis.__puppeteerSandboxPatch = true;
      
      // Try to intercept puppeteer via dynamic import
      const originalImportMeta = import.meta;
      
      // Store original require if it exists
      const Module = require('module');
      if (Module) {
        const orig = Module.prototype.require;
        Module.prototype.require = function(id) {
          const mod = orig.apply(this, arguments);
          
          if ((id === 'puppeteer' || id === 'puppeteer-core') && mod && mod.launch && !mod.__sandboxPatched) {
            console.log('🔧 Puppeteer detected in require - applying sandbox patch');
            const origLaunch = mod.launch;
            
            mod.launch = async function(opts = {}) {
              const patched = {
                ...opts,
                args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage',
                  '--disable-gpu',
                  ...(opts.args || [])
                ]
              };
              patched.args = [...new Set(patched.args)];
              console.log('📋 Puppeteer launch args:', patched.args);
              return origLaunch.call(this, patched);
            };
            
            mod.__sandboxPatched = true;
          }
          
          return mod;
        };
      }
    }
  `;
}
