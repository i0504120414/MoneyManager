
import { listAccounts } from '../services/accountService.js';
import fs from 'fs';

async function main() {
  try {
    console.log('\n📋 Fetching all bank accounts...\n');

    const accounts = await listAccounts();

    if (accounts.length === 0) {
      console.log('No accounts found');
      fs.writeFileSync('accounts-list.json', JSON.stringify({ accounts: [], total: 0 }, null, 2));
      return;
    }

    // Remove sensitive data before displaying
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      bankType: account.bank_type,
      createdAt: account.created_at,
      lastUpdated: account.last_updated,
      isActive: account.is_active,
    }));

    console.log('📌 Bank Accounts:');
    console.log('─'.repeat(80));
    safeAccounts.forEach((acc, index) => {
      console.log(`${index + 1}. ID: ${acc.id}`);
      console.log(`   Bank: ${acc.bankType}`);
      console.log(`   Created: ${acc.createdAt}`);
      console.log(`   Last Updated: ${acc.lastUpdated}`);
      console.log(`   Active: ${acc.isActive}`);
      console.log('');
    });

    const summary = {
      total: accounts.length,
      accounts: safeAccounts,
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync('accounts-list.json', JSON.stringify(summary, null, 2));
    console.log(`✓ Total accounts: ${accounts.length}`);

  } catch (error) {
    console.error(`✗ Failed to list accounts: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
