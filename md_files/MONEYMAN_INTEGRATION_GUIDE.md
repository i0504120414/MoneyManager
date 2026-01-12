## Integration Guide: Moneyman Security Patterns into MoneyManager

### Overview
You've already integrated comprehensive logging in `scrapeTransactions.js` that matches the moneyman pattern.
The following outlines how to use the security modules from moneyman_folder for your project.

---

## 1. Current State: Logging Pattern (��� Already Integrated)

**File:** `src/scripts/scrapeTransactions.js`

Your script now categorizes logs by operation:
```
[START]   - Initialization
[INFO]    - Configuration details  
[SCRAPE]  - Banking API interactions
[PROCESS] - Transaction processing
[DB]      - Database operations
[SUCCESS] - Completion milestones
[ERROR]   - Failure details
```

**Usage Pattern (from scrape.ts):**
```javascript
logger(`started`);
// ... operation
logger(`[TAG] Message with ${context}`);
// ... operation
logger(`ended`);
```

---

## 2. Domain Rule Manager Pattern (Could Be Integrated)

**File:** `moneyman_folder/security/domainRules.ts`

### What It Does:
- Manages per-company firewall rules (ALLOW/BLOCK domains)
- Uses Trie data structure for efficient parent domain matching
- Caches rule lookups for performance

### Key Classes:
```typescript
class DomainRuleManager {
  parsexxxxRules(rulesText: string): void
  insertRule(company: string, action: "ALLOW"|"BLOCK", domain: string): void
  lookupRule(url: string, company: string): RuleMatch | undefined
}
```

### Example Use Cases for MoneyManager:
1. **Request Filtering** - Block/allow specific bank API domains
2. **Security Auditing** - Log which domains each bank scraper contacts
3. **Network Isolation** - Restrict Visa Cal scraper to Visa's domain only

### Integration Approach:
```typescript
// src/security/domainRules.ts (new file)
import { DomainRuleManager } from "../../moneyman_folder/security/domainRules";

const rules = new DomainRuleManager();
rules.insertRule("visaCal", "ALLOW", "visa.co.il");
rules.insertRule("visaCal", "ALLOW", "otp.visa.co.il");

// Check if a request is allowed
const match = rules.lookupRule(requestUrl, "visaCal");
if (match?.action === "BLOCK") {
  throw new Error(`Request to ${requestUrl} blocked for visaCal`);
}
```

---

## 3. Domain Tracking Pattern (Could Be Integrated)

**File:** `moneyman_folder/security/domains.ts`

### What It Does:
- Intercepts all outgoing HTTP requests from Puppeteer pages
- Logs which domains are being accessed
- Can block requests based on DomainRuleManager rules
- Tracks frame navigation and page loads

### Key Functions:
```typescript
async function initDomainTracking(
  context: BrowserContext, 
  companyId: CompanyTypes
): Promise<void>

async function monitorNodeConnections(): Promise<void>
```

### What It Would Show For Your Scraper:
When Visa Cal scraper runs, you'd see logs like:
```
[DOMAIN] Page navigating to: https://www.visa.co.il/...
[DOMAIN] Request to: https://otp.visa.co.il/auth (ALLOWED)
[DOMAIN] Request to: https://suspicious-domain.com (BLOCKED)
[DOMAIN] Frame navigated: https://secure.visa.co.il/login
```

### Integration Approach:
```javascript
// In your scraper setup (scraper.js or visa-cal patching)
import { initDomainTracking } from "../../moneyman_folder/security/domains";

// After creating browser context
const context = await browser.createBrowserContext();
await initDomainTracking(context, "visaCal");
```

---

## 4. How This Solves Your Current Problem

**Current Issue:** Visa Cal scraper silently hangs after extraction
**Root Cause:** Unknown which HTTP request is timing out

**With Domain Tracking Integrated:**
1. Every request logged with [DOMAIN] tag
2. Can see exact URL that's hanging
3. Can identify if it's a network issue vs. browser issue
4. Can whitelist/blacklist specific endpoints

**Example Output:**
```
[SCRAPE] Starting scrape operation...
[DOMAIN] Page navigating to: https://www.visa.co.il/
[DOMAIN] Request to: https://api.visa.co.il/login (2000ms)
[DOMAIN] Request to: https://otp.visa.co.il/verify (15000ms) ���� SLOW
[DOMAIN] Request to: https://api.visa.co.il/transactions (TIMEOUT after 60000ms)
[ERROR] Request timeout on: https://api.visa.co.il/transactions
```

---

## 5. Integration Steps (If Needed)

### Step 1: Create wrapper for domain tracking
```bash
# File: src/security/requestMonitoring.ts (new)
```

### Step 2: Load domain rules from config
```javascript
// config/bankDomains.json
{
  "visaCal": {
    "allowed": ["visa.co.il", "otp.visa.co.il", "api.visa.co.il"],
    "blocked": []
  }
}
```

### Step 3: Initialize tracking in browser setup
```javascript
// In scraper.js or browser creation
const rules = loadBankDomains();
const context = await browser.createBrowserContext();
await initDomainTracking(context, "visaCal", rules);
```

---

## 6. Current Recommendation

**Your logging is sufficient for now.** The next step is:

1. ��� Run scraper with current logging
2. Identify which [TAG] the script stops at
3. If it stops at [SCRAPE], apply all remaining timeout increases (temp.patch hunks 1,3,4,5)
4. If it stops at [DB], check Supabasexxxxxxction timeout
5. If silent (no TAG), add more granular logging in scraper.js

Once you identify the exact failure point with current logging, then decide if domain tracking would help.

---

## 7. File Reference

**New Files from moneyman_folder:**
- `moneyman_folder/security/domainRules.ts` - Domain firewall rules
- `moneyman_folder/security/domains.ts` - Request interception & logging
- `moneyman_folder/security/domainRules.test.ts` - Unit tests
- `moneyman_folder/security/domains.test.ts` - Unit tests

**Can be imported and used directly without modifications.**

---

## Next Action

Run your scraper with the current logging implementation to see which checkpoint it reaches. This will tell us exactly where to focus debugging efforts.
