
import { getAccountDetails , getAccountChildren} from "./listAccounts.js";
import { scrape } from "./scraper.js";
import { createClient } from '@supabase/supabase-js';


async function main() {

  const accountId = process.env.ACCOUNT_ID;
  const scrapingMode = process.env.SCRAPING_MODE || 'update';
  let startDate = process.env.START_DATE;
  
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  if (!accountId) {
    console.error('ACCOUNT_ID environment variable is required');
    process.exit(1);
  }


  console.log(`Starting transaction scraping...`);
  console.log(`   Account ID: ${accountId}`);
  console.log(`   Mode: ${scrapingMode}`);
  
  if (scrapingMode === 'regular' && !startDate) {
    console.error('START_DATE environment variable is required for regular scraping mode');
    process.exit(1);
  }

  if (scrapingMode === 'regular' && startDate) {
    console.log(`   Start Date: ${startDate}`);
  }

  if (scrapingMode === 'max') {
    // Default to 30 days ago if no last scrape date
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
  }

  if (scrapingMode === 'update') {
    startDate =  await getAccountDetails().then(details => {
      const lastScrape = details.last_scraped_at;
      if (lastScrape) {
        return new Date(lastScrape);
      } else {
        // Default to 30 days ago if no last scrape date
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      }
    });
  }


  const accountDetails = await getAccountDetails();
  const credentials = accountDetails.credentials;
  const bankType = accountDetails.bank_type;

  try {
    const result = await scrape(bankType, credentials, startDate);

    console.log('result status:', result.success);
    if(!result.success) {
      throw new Error(result.error || 'Scraping failed without a specific error message');
      process.exit(1);
    }

    
    const tnxsList = [];
    for (const acc of result.accounts) {

      console.log(`Processing account: ${acc.accountNumber || 'N/A' } with ${acc.txns ? acc.txns.length : 0} transaction(s)`);
      const {data: accountData, error :accountError} = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_account_id', accountId)
      .eq('account_number', acc.accountNumber)
      .single();
      if (accountError) {
        throw new Error(`Failed to fetch bank account for transactions: ${accountError.message}`);
      }
      console.log('accountData:', accountData);
      console.log(`Mapped to bank_accounts ID: ${accountData.id}`);
      console.log(`Found ${acc.txns ? acc.txns.length : 0} transaction(s) for this account`);
      if (acc.txns ) {
          tnxsList.push(...acc.txns.map(tx => ({
          account_id: accountData.id,
          identifier: tx.identifier || null,
          date: tx.date,
          processed_date: tx.processedDate || null,
          original_amount: tx.originalAmount || 0,
          original_currency: tx.originalCurrency || 'ILS',
          charged_amount: tx.chargedAmount || 0,
          description: tx.description || '',
          memo: tx.memo || null,
          type: tx.type || 'normal',
          installment_number: tx.installments?.number || null,
          installment_total: tx.installments?.total || null,
        })));
      }
    }


    console.log('✓ Scraping completed successfully');
    console.log(`found ${tnxsList.length} transaction(s)`);
    
    
    // Save transactions to database
    console.log('Saving transactions to database...');
    
    if (tnxsList.length > 0) {
      const {data , error} = await supabase
        .from('transactions')
        .insert(tnxsList)
        .select();
      if (error) {
        if (error.code === '23505' || error.message.includes('duplicate')) {
          console.log(`⚠ Some transactions already exist. Skipping duplicates.`);
        } else {
          throw new Error(`Failed to save transactions: ${error.message}`);
        }
      } else {
        console.log(`✓ Transactions saved: ${data ? data.length : 0} transaction(s)`);
      }
    }
    console.log(`${tnxsList.length} transactions processed successfully` );

    // Update last_scraped_at in bank_accounts
    const { data: updateData, error: updateError } = await supabase
      .from('bank_accounts')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', accountId);

    if (updateError) {
      throw new Error(`Failed to update last_scraped_at: ${updateError.message}`);
      process.exit(1);
    }
    console.log('✓ last_scraped_at updated successfully');


   
  
  } catch (error) {
   
    console.error(`Scraping failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});










//  // Save each bank account
//     console.log('Saving bank accounts to database...');
//     const accountsToInsert = result.accounts.map(account => ({
//       user_account_id: userAccountId,
//       account_number: account.accountNumber || '',
//       bank_type: bankType,
//       balance: account.balance || 0,
//       is_active: true
//     }));

//     const {data: accountsData, error: accountsError} = await supabase
//       .from('bank_accounts')
//       .insert(accountsToInsert)
//       .select();
    
//     let savedAccountsData = accountsData;
    
//     if (accountsError) {
//       // Check if it's a duplicate key error
//       if (accountsError.code === '23505' || accountsError.message.includes('duplicate')) {
//         console.log(`⚠ Some accounts already exist. Updating existing accounts...`);
        
//         // Update existing accounts with new balance
//         for (const account of accountsToInsert) {
//           const { error: updateError } = await supabase
//             .from('bank_accounts')
//             .update({
//               balance: account.balance,
//               last_updated: new Date().toISOString(),
//               is_active: true
//             })
//             .eq('user_account_id', userAccountId)
//             .eq('account_number', account.account_number);
          
//           if (updateError) {
//             console.log(`⚠ Failed to update account ${account.account_number}: ${updateError.message}`);
//           }
//         }
//         console.log(`✓ Accounts updated with ${result.accounts.length} account(s)`);
        
//         // Fetch the updated accounts to get their IDs
//         const { data: fetchedAccounts, error: fetchError } = await supabase
//           .from('bank_accounts')
//           .select('id, account_number')
//           .eq('user_account_id', userAccountId);
        
//         if (fetchError) {
//           throw new Error(`Failed to fetch bank accounts: ${fetchError.message}`);
//         }
//         savedAccountsData = fetchedAccounts;
//       } else {
//         throw new Error(`Failed to save bank accounts: ${accountsError.message}`);
//       }
//     } else {
//       console.log(`✓ Bank accounts saved with ${accountsData.length} account(s)`);
//     }


//     // Save transactions
//     console.log('Saving transactions to database...');
//     const transactionsToInsert = [];
    
//     // Create a map of account numbers to their Supabase IDs
    

//     for (const account of result.accounts) {
//       if (account.txns && account.txns.length > 0) {
//         const supabaseAccountId = accountMap[account.accountNumber];
        
//         if (!supabaseAccountId) {
//           console.log(`⚠ Could not find Supabase ID for account ${account.accountNumber}, skipping transactions`);
//           continue;
//         }

//         const mappedTransactions = account.txns.map(tx => ({
//           account_id: supabaseAccountId,
//           identifier: tx.identifier || null,
//           date: tx.date,
//           processed_date: tx.processedDate || null,
//           original_amount: tx.originalAmount || 0,
//           original_currency: tx.originalCurrency || 'ILS',
//           charged_amount: tx.chargedAmount || 0,
//           description: tx.description || '',
//           memo: tx.memo || null,
//           type: tx.type || 'normal',
//           installment_number: tx.installments?.number || null,
//           installment_total: tx.installments?.total || null,
//           status: tx.status || 'completed',
//           created_at: new Date().toISOString()
//         }));
        
//         transactionsToInsert.push(...mappedTransactions);
//       }
//     }

//     if (transactionsToInsert.length > 0) {
//       const { data: transactionsData, error: transactionsError } = await supabase
//         .from('transactions')
//         .insert(transactionsToInsert)
//         .select();
        
//       if (transactionsError) {
//         if (transactionsError.code === '23505' || transactionsError.message.includes('duplicate')) {
//           console.log(`⚠ Some transactions already exist. Skipping duplicates.`);
//         } else {
//           throw new Error(`Failed to save transactions: ${transactionsError.message}`);
//         }
//       } else {
//         console.log(`✓ Transactions saved: ${transactionsData.length} transaction(s)`);
//       }
//     } else {
//       console.log(`ℹ No transactions to save`);
//     }

