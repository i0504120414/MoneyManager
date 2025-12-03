# 💰 Money Manager - Israeli Bank Account Scraper

Automated system for scraping transactions from Israeli banks using GitHub Actions, Supabase, and the Israeli Bank Scrapers library.

## 🏗️ Architecture

### GitHub Actions Workflows

1. **Add Account** (`.github/workflows/add-account.yml`)
   - Manual trigger workflow
   - Prompts user for bank type and credentials
   - Tests connection before adding account
   - Saves account with unique ID to Supabase

2. **Scrape Transactions** (`.github/workflows/scrape-transactions.yml`)
   - Manual or scheduled (daily at 8 AM UTC)
   - Accepts account ID and scraping mode
   - Modes:
     - `regular`: Last 3 months
     - `update`: Since last update
     - `deep`: As far back as possible
     - `custom`: User-specified date range
   - Saves transactions with account reference

3. **List Accounts** (`.github/workflows/list-accounts.yml`)
   - Manual trigger
   - Lists all active bank accounts
   - Excludes sensitive credential data

### Supported Banks

- Bank Hapoalim
- Bank Leumi
- Mizrahi Bank
- Discount Bank
- Mercantile Bank
- Bank Otsar Hahayal
- Max
- Visa Cal
- Isracard
- Amex
- Union
- Beinleumi
- Massad
- Bank Yahav
- Beyahad Bishvilha
- One Zero
- Behatsdaa
- Pagi

## 📊 Database Schema (Supabase)

### `bank_accounts` Table
```sql
- id: UUID (primary key)
- bank_type: VARCHAR(50)
- credentials: JSONB (encrypted in production)
- created_at: TIMESTAMP
- last_updated: TIMESTAMP
- is_active: BOOLEAN
```

### `transactions` Table
```sql
- id: UUID (primary key)
- account_id: UUID (foreign key)
- date: TIMESTAMP
- description: VARCHAR(500)
- amount: DECIMAL(12, 2)
- type: VARCHAR(10) ('debit' | 'credit')
- category: VARCHAR(50)
- raw_data: JSONB
- created_at: TIMESTAMP
```

## 🚀 Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/MoneyManager.git
cd MoneyManager
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Get your `SUPABASE_URL` and `SUPABASE_KEY`
3. Create tables using the SQL provided in `src/scripts/setupDatabase.js`

### 4. Add GitHub Secrets

In your repository settings, add:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anonymous key

**📖 Detailed Guide:** See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) for step-by-step instructions on how to add Secrets to GitHub

### 5. Run Workflows

#### Add New Bank Account
1. Go to **Actions** → **Add Account**
2. Click **Run workflow**
3. Fill in:
   - Bank Type (dropdown)
   - Credentials (based on selected bank)
4. Review results in workflow logs

#### Scrape Transactions
1. Go to **Actions** → **Scrape Transactions**
2. Click **Run workflow**
3. Enter:
   - Account ID (from previous step)
   - Scraping Mode (regular/update/deep/custom)
   - Start Date (if custom mode)

#### List Accounts
1. Go to **Actions** → **List Accounts**
2. Click **Run workflow**
3. View results in artifacts

## 📝 Local Development

### Test Bank Connection
```bash
SUPABASE_URL=your_url SUPABASE_KEY=your_key \
BANK_TYPE=hapoalim USER_CODE=123456 PASSWORD=yourpassword \
node src/scripts/testBankConnection.js
```

### Add Account
```bash
SUPABASE_URL=your_url SUPABASE_KEY=your_key \
BANK_TYPE=hapoalim USER_CODE=123456 PASSWORD=yourpassword \
node src/scripts/addAccount.js
```

### Scrape Transactions
```bash
SUPABASE_URL=your_url SUPABASE_KEY=your_key \
ACCOUNT_ID=your-account-id SCRAPING_MODE=regular \
node src/scripts/scrapeTransactions.js
```

### List Accounts
```bash
SUPABASE_URL=your_url SUPABASE_KEY=your_key \
node src/scripts/listAccounts.js
```

## 🔐 Security Considerations

1. **Never commit credentials** - Always use GitHub Secrets
2. **Encrypt credentials in Supabase** - Current setup uses JSONB; consider encryption for production
3. **Use GitHub Secrets** - Bank credentials are passed as secrets and not logged
4. **Restrict workflow access** - Limit who can trigger workflows
5. **Regular updates** - Keep `israeli-bank-scrapers` library updated

## 📦 Project Structure

```
MoneyManager/
├── .github/
│   └── workflows/
│       ├── add-account.yml
│       ├── scrape-transactions.yml
│       └── list-accounts.yml
├── src/
│   ├── config/
│   │   └── banks.js
│   ├── db/
│   │   └── client.js
│   ├── services/
│   │   ├── accountService.js
│   │   └── scrapingService.js
│   └── scripts/
│       ├── addAccount.js
│       ├── testBankConnection.js
│       ├── scrapeTransactions.js
│       ├── listAccounts.js
│       └── setupDatabase.js
├── package.json
├── .env.example
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT

## ⚠️ Disclaimer

This tool is for educational and personal use only. Ensure you comply with your bank's terms of service when using automated scraping tools.
