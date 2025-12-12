import { createLogger, logToMetadataFile, logHTTPRequest } from '../utils/logger.js';
import DomainRuleManager, { DEFAULT_RULES } from './domainRules.js';

const logger = createLogger('domains');

/**
 * Initialize domain tracking for a Puppeteer browser context
 * Monitors all HTTP requests and applies firewall rules
 */
export async function initDomainTracking(browserContext, companyId) {
  logger(`Initializing domain tracking for company: ${companyId}`);
  
  // Create domain rule manager
  const ruleManager = new DomainRuleManager();
  ruleManager.parseDomainRules(DEFAULT_RULES);
  
  // Track frame navigation events
  browserContext.on('page', (page) => {
    logger(`New page created in context`);
    
    page.on('framenavigated', (frame) => {
      const url = frame.url();
      if (url && url !== 'about:blank') {
        logger(`Frame navigated: ${url}`);
        logToMetadataFile('Frame navigation', { url, companyId });
      }
    });
    
    // Request interception for domain filtering
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      const startTime = Date.now();
      
      try {
        const rule = ruleManager.getRule(url, companyId);
        logHTTPRequest(url, method, null, null);
        
        if (rule.action === 'BLOCK') {
          logger(`Blocking request: ${url}`);
          request.abort('blockedbyclient');
          logToMetadataFile('Request blocked', { url, rule: rule.reason });
        } else {
          request.continue();
        }
      } catch (error) {
        logger(`Error processing request ${url}:`, error);
        request.continue(); // Let request through if there's an error
      }
    });
    
    // Log response timings
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();
      logHTTPRequest(url, 'GET', status, null);
      
      if (status >= 400) {
        logger(`HTTP ${status} from ${url}`);
        logToMetadataFile('HTTP error', { url, status, companyId });
      }
    });
  });
  
  logger('Domain tracking initialized');
}

/**
 * Check if a URL is allowed by current rules
 */
export function isUrlAllowed(url, companyId) {
  const ruleManager = new DomainRuleManager();
  ruleManager.parseDomainRules(DEFAULT_RULES);
  const rule = ruleManager.getRule(url, companyId);
  return rule.action === 'ALLOW';
}

export default { initDomainTracking, isUrlAllowed };
