const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTransactions() {
  console.log('Fetching recent transactions...');
  const { data, error } = await supabase
    .from('transactions')
    .select('id, remarks, balance, is_finalized, is_settlement, transaction_date')
    .order('transaction_date', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Recent Transactions:');
    console.table(data);
  }
}

checkTransactions();
