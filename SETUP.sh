#!/bin/bash
# Setup Guide for MoneyManager Project
# This script helps initialize and configure the MoneyManager application

set -e

echo "================================"
echo "MoneyManager Setup Guide"
echo "================================"
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version
npm --version

# Install dependencies
echo ""
echo "✓ Installing dependencies..."
npm ci

# Create necessary directories
echo ""
echo "✓ Creating directories..."
mkdir -p logs
mkdir -p app/screenshots

# Environment setup instructions
echo ""
echo "================================"
echo "Configuration Steps"
echo "================================"
echo ""
echo "1. Supabase Setup:"
echo "   - Create a Supabase project at https://supabase.com"
echo "   - Run the database schema: database.sql"
echo "   - Get your URL and API key"
echo ""
echo "2. GitHub Secrets Setup:"
echo "   - Go to: Settings > Secrets and Variables > Actions"
echo "   - Add secrets:"
echo "     SUPABASE_URL=your-url"
echo "     SUPABASE_KEY=your-key"
echo ""
echo "3. Environment Variables (.env.local for local dev):"
echo "   - Copy .env.example to .env.local"
echo "   - Add Supabase credentials"
echo ""
echo "4xxxxxxxxxxxxction:"
npm run test:connection

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "- Register accounts: Go to GitHub Actions > 'Test Bank Connection & Add Account'"
echo "- Monitor syncs: Logs are saved to Supabase logs table"
echo "- Check transactions: Query bank_accounts and transactions tables"
echo ""
