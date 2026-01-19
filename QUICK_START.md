# MoneyManager - Quick Start Guide

## What Changed?

This document explains the implementation of the MoneyManager specification. All changes maintain compatibility with the existing Docker setup while implementing the full specification.

## Key Architecture Changes

### 1. Security: Credentials Management ✨
**Before**: Credentials stored in Supabase database (risky)  
**After**: Credentials stored ONLY in GitHub Secrets (secure)

**How it works**:
1. User provides credentials via GitHub Actions UI
2. System validates them immediately (test connection)
3. On success, credentials are saved to GitHub Secrets (not database)
4. Database stores only metadata and reference to secret
5. During scraping, credentials are retrieved from Secrets on-demand

### 2. Transaction Deduplication ✨
**Before**: Potential duplicate transactions in database  
**After**: Hash-based deduplication

**How it works**:
- Each transaction gets a SHA-256 hash
- Hash = account_id + date + description + amount
- Duplicate detection happens at database level
- Identical transactions are automatically skipped

### 3. Recurring Transaction Detection ✨
**New Feature**: Automatic identification of recurring charges

Three detection methods:
- **Installments**: Extracted from bank metadata
- **Direct Debits**: Keyword matching (Hebrew + English)
- **Algorithmic**: Pattern analysis (same amount/description, monthly)

Results stored in `recurring` table with confidence levels.

### 4. Comprehensive Logging ✨
**New Feature**: All operations logged to database

Every important action is recorded:
- Account registration
- Transaction syncs
- Errors and warnings
- Recurring detection
- User actions

Queryable through `logs` table in Supabase.

## File Structure

```
MoneyManager/
├── database.sql                          # Updated schema
├── package.json                          # No changes (deps already installed)
├── Dockerfile                            # No changes (still works)
│
├── .github/workflows/
│   ├── add-account.yml                  # UPDATED: Now saves to Secrets
│   ├── daily-sync.yml                   # NEW: Daily automation
│   ├── scrape-transactions.yml          # Still works as before
│   ├── build-docker-image.yml           # No changes
│   └── list-accounts.yml                # No changes
│
├── src/
│   ├── scripts/
│   │   ├── scrapeTransactions.js        # UPDATED: Hash + deduplication
│   │   ├── addAccount.js                # UPDATED: Secrets integration
│   │   ├── detectRecurring.js           # NEW: Recurring detection
│   │   ├── scraper.js                   # No changes
│   │   ├── listAccounts.js              # No changes
│   │   ├── testConnection.js            # No changes
│   │   └── setupDatabase.js             # No changes
│   │
│   ├── utils/
│   │   └── logger.js                    # UPDATED: Better logging
│   │
│   ├── config/
│   │   └── banks.js                     # No changes
│   │
│   ├── scrapers/
│   │   └── cloudflareSolver.js          # No changes
│   │
│   └── security/
│       └── domains.js                   # No changes
│
├── md_files/
│   └── ... (documentation)
│
├── patches/
│   └── ... (dependency patches)
│
├── app/
│   └── screenshots/                     # Created by Docker
│
└── docs/
    ├── IMPLEMENTATION_NOTES.md          # NEW: Full implementation details
    ├── SETUP.sh                         # NEW: Setup script
    └── QUICK_START.md                   # THIS FILE
```

## Usage Flow

### 1. Register a Bank Account (One-time)
```
1. Go to: GitHub Actions > "Test Bank Connection & Add Account"
2. Select bank type (hapoalim, beinleumi, etc.)
3. Enter credentials (username, password, etc.)
4. Click "Run workflow"
5. System will:
   - Tesxxxxxxxction with your credentials
   - Validate one day of transactions
   - Save account to database
   - Store credentials in GitHub Secrets
   - Notify you of success/failure
```

### 2. Automatic Daily Sync (Automatic)
```
- Runs every day at 8 AM UTC automatically
- Can also be triggered manually
- For each account:
  - Fetches new transactions
  - Deduplicates against existing
  - Detects recurring charges
  - Updates database
- Sends you notifications of any issues
```

### 3. View Transactions (React Frontend)
```
- Login with email/password (Supabase Auth)
- See all accounts and balances
- View transaction history
- Manage recurring charges
- Set budget categories
- See forecast (in future)
```

## Database Schema

### Main Tables
- **bank_accounts**: Your bank account details
- **bank_user_accounts**: Login credentials (now mostly empty)
- **transactions**: All imported transactions with hash
- **categories**: Spending categories you create
- **recurring**: Detected recurring transactions
- **logs**: Audit trail of all operations
- **notifications**: System alerts to you

### Key Fields
- `hash` in transactions: SHA-256 for deduplication
- `github_secret_name` in bank_user_accounts: Reference to Secrets
- `is_confirmed` in recurring: User approval status
- All tables have audit timestamps

## API Endpoints (via Supabase)

Frontend can use Supabase JS client:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Get all transactions
const { data } = await supabase.from('transactions').select('*')

// Get recurring transactions
const { data } = await supabase
  .from('recurring')
  .select('*')
  .eq('is_confirmed', false)

// Get logs
const { data } = await supabase
  .from('logs')
  .select('*')
  .eq('level', 'ERROR')
```

## Security Notes

✅ **Credentials**: GitHub Secrets (encrypted at rest)  
✅ **Database**: Row-Level Security enabled  
✅ **Logs**: Audit trail in database  
✅ **Transactions**: Hashed for deduplication  
❌ **DO NOT**: Commit secrets to git  
❌ **DO NOT**: Log sensitive data  

## Troubleshooting

### Credentials not saving
- Check `GITHUB_TOKEN` is set in Secrets
- Verify repository is in format `owner/repo`
- Check GitHub Actions logs for API errors

### Transactions not syncing
- Check Supabase connection in logs table
- Verify bank credentials are correct
- Check for network issues in GitHub Actions logs

### Duplicate transactions showing
- If not deduplicating: Check `hash` field is populated
- Try running scxxxxxxanually with different dates
- Check transaction descriptions are exact matches

### Recurring detection not working
- Need at least 3 months of transaction history
- Transactions must be roughly monthly
- Check `recurring` table for detected items
- User must approve from UI

## Environment Setup

### Local Development
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DEBUG=1
```

### GitHub Actions
```
Settings > Secrets and Variables > Actions
- SUPABASE_URL
- SUPABASE_KEY
- (GITHUB_TOKEN is automatic)
```

## Next Steps

1. ✅ Database schema updated (run database.sql)
2. ✅ Scripts updated for new security model
3. ✅ Workflows configured for automation
4. ⏭️ Frontend: Implement React UI (based on spec)
5. ⏭️ Auth: Setup Supabase authentication
6. ⏭️ Notifications: Implement email/SMS alerts
7. ⏭️ Analytics: Add forecasting algorithms

## Support

All operations are logged to the `logs` table in Supabase.
Check there first for any issues:

```sql
SELECT * FROM logs 
WHERE level = 'ERROR' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Version Info

- **Specification**: תכנון אפלקיצת משתמש.txt
- **Database**: PostgreSQL (Supabase)
- **Runtime**: Node.js 22
- **Container**: Docker with Chromium
- **CI/CD**: GitHub Actions
- **Status**: ✅ Implementation Complete
