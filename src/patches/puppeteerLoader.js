/**
 * Node.js module loader hook to patch Puppeteer before it's used
 * Run with: node --loader ./src/patches/puppeteerLoader.js script.js
 */

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
    // Patch Puppeteer before anything uses it
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    
    if (isCI) {
      console.log('⚙️  CI/CD detected - patching Puppeteer launch...');
      
      // Hook into module loading to patch puppeteer
      const Module = require('module');
      const originalRequire = Module.prototype.require;
      
      Module.prototype.require = function(id) {
        const mod = originalRequire.apply(this, arguments);
        
        if ((id === 'puppeteer' || id === 'puppeteer-core') && mod && mod.launch) {
          const orig = mod.launch;
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
            console.log('🔧 Puppeteer.launch with args:', patched.args);
            return orig.call(this, patched);
          };
        }
        return mod;
      };
    }
  `;
}
