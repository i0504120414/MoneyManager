import { createLogger } from '../utils/logger.js';

const logger = createLogger('domain-rules');

/**
 * Trie-based domain rule manager for firewall-style access control
 * Supports per-company rules: ALLOW or BLOCK specific domains
 * 
 * Example rules format:
 * VISA_CAL ALLOW visacal.co.il
 * VISA_CAL ALLOW api.visacal.co.il
 * DEFAULT BLOCK *
 */
class DomainRuleManager {
  constructor() {
    // Trie structure: { [reversedDomain]: { rule: 'ALLOW'|'BLOCK', company: string } }
    this.trie = {};
    this.ruleCache = new Map();
    logger('DomainRuleManager initialized');
  }

  /**
   * Parse domain rules from array of strings
   * Format: "COMPANY ACTION domain.com"
   * Example: "VISA_CAL ALLOW visacal.co.il"
   */
  parseDomainRules(rulesArray) {
    logger(`Parsing ${rulesArray.length} domain rules...`);
    rulesArray.forEach(rule => {
      const match = rule.match(/^(\S+)\s+(ALLOW|BLOCK)\s+(.+)$/);
      if (match) {
        const [, company, action, domain] = match;
        this.insertRule(domain, action, company);
      } else {
        logger(`Invalid rule format: ${rule}`);
      }
    });
    logger(`Domain rules loaded`);
  }

  /**
   * Insert rule into trie (reversed for parent domain matching)
   */
  insertRule(domain, action, company) {
    // Reverse domain for trie: visacal.co.il → il.co.visacal
    const reversedDomain = domain.split('.').reverse().join('.');
    const parts = reversedDomain.split('.');
    
    let node = this.trie;
    parts.forEach(part => {
      if (!node[part]) {
        node[part] = {};
      }
      node = node[part];
    });
    
    node._rule = {
      action,
      company,
      domain
    };
    
    this.ruleCache.clear(); // Invalidate cache on new rule
  }

  /**
   * Lookup rule for a URL
   * Returns: { action: 'ALLOW'|'BLOCK', domain: string, reason: string }
   */
  lookupRule(url, company) {
    try {
      const domain = this._extractDomain(url);
      const cacheKey = `${company}:${domain}`;
      
      if (this.ruleCache.has(cacheKey)) {
        return this.ruleCache.get(cacheKey);
      }
      
      const result = this._traverseTrie(domain, company);
      this.ruleCache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger(`Error looking up rule for ${url}:`, error);
      return { action: 'BLOCK', domain: url, reason: 'lookup-error' };
    }
  }

  /**
   * Extract domain from URL
   */
  _extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      // If not a valid URL, return as-is
      return url;
    }
  }

  /**
   * Traverse trie to find applicable rule (parent domain matching)
   */
  _traverseTrie(domain, company) {
    const reversedDomain = domain.split('.').reverse().join('.');
    const parts = reversedDomain.split('.');
    
    let node = this.trie;
    let lastRule = null;
    
    // Traverse from most specific to least specific
    for (let i = 0; i < parts.length; i++) {
      if (node[parts[i]]) {
        node = node[parts[i]];
        if (node._rule && node._rule.company === company) {
          lastRule = node._rule;
        }
      }
    }
    
    if (lastRule) {
      return {
        action: lastRule.action,
        domain: lastRule.domain,
        reason: 'matched-rule'
      };
    }
    
    // Default: allow known bank domains, block unknown
    return {
      action: 'BLOCK',
      domain: domain,
      reason: 'no-matching-rule'
    };
  }

  /**
   * Get rule for a domain (high-level API)
   */
  getRule(url, company = 'VISA_CAL') {
    const result = this.lookupRule(url, company);
    logger(`[${company}] ${result.action} ${result.domain} (${result.reason})`);
    return result;
  }
}

// Pre-configured rules for Israeli banks
export const DEFAULT_RULES = [
  // Visa Cal
  'VISA_CAL ALLOW visacal.co.il',
  'VISA_CAL ALLOW api.visacal.co.il',
  'VISA_CAL ALLOW account.visacal.co.il',
  'VISA_CAL ALLOW *.visacal.co.il',
  
  // Known third-party services
  'VISA_CAL ALLOW google.com',
  'VISA_CAL ALLOW googleapis.com',
  'VISA_CAL ALLOW cloudflare.com',
  
  // Default deny
  'DEFAULT BLOCK *'
];

export default DomainRuleManager;
