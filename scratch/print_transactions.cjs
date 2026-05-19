const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function checkTransactions() {
  console.log('Connecting to Supabase URL:', supabaseUrl);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/transactions?party_id=eq.46ea1c50-89a4-4784-8388-a73f49f088e0&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${await response.text()}`);
    }
    
    const transactions = await response.json();
    console.log('\n--- TRANSACTIONS FOR PARTY: Give (46ea1c50-89a4-4784-8388-a73f49f088e0) ---');
    console.table(transactions.map(t => ({
      id: t.id,
      date: t.transaction_date,
      remarks: t.remarks,
      type: t.tns_type,
      credit: t.credit,
      debit: t.debit,
      balance: t.balance,
      is_settlement: t.is_settlement
    })));
  } catch (error) {
    console.error('Error running check:', error);
  }
}

checkTransactions();
