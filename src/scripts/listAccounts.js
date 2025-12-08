import { createClient } from '@supabase/supabase-js';

export async function getAccountDetails() {


  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const accountId = process.env.ACCOUNT_ID;

  if (!accountId) {
    console.error('ACCOUNT_ID environment variable is required');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Listing accounts for ACCOUNT_ID:', accountId);
  
  try {
    const { data, error } = await supabase
      .from('bank_user_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    if (error) {
      throw new Error(`Failed to fetch account: ${error.message}`);
    }
    if (!data) {
      throw new Error('No account found with the provided ACCOUNT_ID');
    }
    console.log('Account details:');
    console.log('account bank type:', data.bank_type);
    console.log('account credentials:', data.credentials);
    console.log('account created at:', data.created_at);

    return data;
  } 
  catch (error) {
    console.error(`✗ failed to list account: ${error.message}`);
    process.exit(1);
  }
}

getAccountDetails().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

export async function listAccounts() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Listing all bank user accounts...');
  try {
    const { data, error } = await supabase
      .from('bank_user_accounts')
      .select('*');
    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
    if (!data) {
      throw new Error('No accounts found');
    }
    console.log('Accounts:', data);
    return data;
  } catch (error) {
    console.error(`✗ failed to list accounts: ${error.message}`);
    process.exit(1);
  }
}
listAccounts().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});


export
async function getAccountChildren() {


  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const accountId = process.env.ACCOUNT_ID;

  if (!accountId) {
    console.error('ACCOUNT_ID environment variable is required');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Listing accounts for ACCOUNT_ID:', accountId);
  
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_account_id', accountId)
      
    if (error) {
      throw new Error(`Failed to fetch account: ${error.message}`);
    }
    if (!data) {
      throw new Error('No account found with the provided ACCOUNT_ID');
    }
    console.log('Child account details:');
    data.forEach(account => {
      console.log('account id:', account.id);
      console.log('account number:', account.account_number);
      console.log('last updated:', account.last_updated);

    });
    return data;
  } 
  catch (error) {
    console.error(`✗ failed to list account: ${error.message}`);
    process.exit(1);
  }
}

getAccountChildren().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});