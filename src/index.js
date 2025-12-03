#!/usr/bin/env node

/**
 * Main entry point for Money Manager CLI
 * Usage: npm run dev
 */

import dotenv from 'dotenv';

dotenv.config();

console.log(`
╔════════════════════════════════════════════════════════════╗
║          💰 Money Manager - Israeli Bank Scraper           ║
║                                                            ║
║  GitHub Actions Automated Transaction Scraper & Manager   ║
╚════════════════════════════════════════════════════════════╝

📋 Available Commands:
  npm test:connection      - Test bank connection
  npm scrape              - Scrape transactions
  npm setup:db            - Setup database

🔗 GitHub Actions Workflows:
  1. Add Account          - Add a new bank account
  2. Scrape Transactions  - Scrape transactions from account
  3. List Accounts        - View all connected accounts

📖 Documentation:
  - README.md             - Project overview
  - SUPABASE_SETUP.md     - Database setup guide
  - USAGE_GUIDE.md        - User guide

🚀 Quick Start:
  1. Set up Supabase: https://supabase.com
  2. Add GitHub Secrets in repository settings
  3. Go to Actions tab to run workflows

📧 For issues, check GitHub Issues or documentation
`);
