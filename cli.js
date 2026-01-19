#!/usr/bin/env node

/**
 * CLI Tool for MoneyManager
 * Triggers GitHub Actions for account management and sync
 */

import https from 'https';
import readline from 'readline';

// Configuration
const GITHUB_OWNER = 'i0504120414'; // Your GitHub username
const GITHUB_REPO = 'MoneyManager';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function triggerWorkflow(workflowId, inputs = {}) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is not set');
    console.log('\nTo set up:');
    console.log('1. Go to GitHub → Settings → Developer settings → Personal access tokens');
    console.log('2. Create a token with "repo" and "workflow" permissions');
    console.log('3. Run: $env:GITHUB_TOKEN="your-token-here"');
    process.exit(1);
  }

  const data = JSON.stringify({
    ref: 'main',
    inputs
  });

  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowId}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MoneyManager-CLI',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({ success: true });
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function addAccount() {
  console.log('\n🏦 הוספת חשבון חדש\n');
  
  const banks = [
    { id: 'hapoalim', name: 'בנק הפועלים', fields: ['userCode', 'password'] },
    { id: 'leumi', name: 'בנק לאומי', fields: ['username', 'password'] },
    { id: 'discount', name: 'בנק דיסקונט', fields: ['id', 'password', 'num'] },
    { id: 'mizrahi', name: 'מזרחי טפחות', fields: ['username', 'password'] },
    { id: 'isracard', name: 'ישראכרט', fields: ['id', 'card6Digits', 'password'] },
    { id: 'visaCal', name: 'ויזה כאל', fields: ['username', 'password'] },
    { id: 'max', name: 'מקס', fields: ['username', 'password'] },
    { id: 'amex', name: 'אמריקן אקספרס', fields: ['id', 'card6Digits', 'password'] },
    { id: 'behatsdaa', name: 'בהצדעה', fields: ['id', 'password'] },
    { id: 'otsarHahayal', name: 'אוצר החייל', fields: ['username', 'password'] },
    { id: 'beinleumi', name: 'הבינלאומי', fields: ['username', 'password'] },
  ];

  console.log('בחר בנק/כרטיס אשראי:');
  banks.forEach((bank, i) => {
    console.log(`  ${i + 1}. ${bank.name}`);
  });

  const bankChoice = await question('\nמספר הבנק: ');
  const bankIndex = parseInt(bankChoice) - 1;
  
  if (bankIndex < 0 || bankIndex >= banks.length) {
    console.error('❌ בחירה לא תקינה');
    rl.close();
    return;
  }

  const selectedBank = banks[bankIndex];
  console.log(`\n✓ נבחר: ${selectedBank.name}\n`);

  const inputs = { bank_type: selectedBank.id };
  
  const fieldLabels = {
    userCode: 'קוד משתמש: ',
    username: 'שם משתמש: ',
    id: 'תעודת זהות: ',
    password: 'סיסמה: ',
    num: 'מספר סניף/חשבון: ',
    card6Digits: '6 ספרות אחרונות של הכרטיס: '
  };

  for (const field of selectedBank.fields) {
    inputs[field] = await question(fieldLabels[field] || `${field}: `);
  }

  console.log('\n⏳ שולח בקשה ל-GitHub Actions...\n');

  try {
    await triggerWorkflow('add-account.yml', inputs);
    
    console.log('✅ הבקשה נשלחה בהצלחה!');
    console.log('📋 ניתן לעקוב אחרי ההתקדמות ב:');
    console.log(`   https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }

  rl.close();
}

async function syncAccounts() {
  console.log('\n🔄 סנכרון עסקאות\n');
  console.log('⏳ שולח בקשה ל-GitHub Actions...\n');

  try {
    await triggerWorkflow('daily-sync.yml', {});
    
    console.log('✅ הבקשה נשלחה בהצלחה!');
    console.log('📋 ניתן לעקוב אחרי ההתקדמות ב:');
    console.log(`   https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions`);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }

  rl.close();
}

async function main() {
  const command = process.argv[2];

  console.log('╔═══════════════════════════════════════╗');
  console.log('║       MoneyManager CLI Tool           ║');
  console.log('╚═══════════════════════════════════════╝');

  switch (command) {
    case 'add-account':
      await addAccount();
      break;
    case 'sync':
      await syncAccounts();
      break;
    default:
      console.log('\nשימוש:');
      console.log('  node cli.js add-account   - הוספת חשבון בנק/כרטיס אשראי');
      console.log('  node cli.js sync          - סנכרון עסקאות');
      console.log('\nדוגמאות:');
      console.log('  node cli.js add-account');
      console.log('  node cli.js sync');
      rl.close();
  }
}

main().catch(console.error);
