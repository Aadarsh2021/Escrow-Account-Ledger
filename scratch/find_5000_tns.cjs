const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function find5000Tns() {
  console.log('Connecting to Supabase URL:', supabaseUrl);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/transactions?or=(credit.eq.5000,debit.eq.5000)&select=*,parties(party_name,status,commission_rate)`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${await response.text()}`);
    }
    
    const transactions = await response.json();
    console.log('\n--- TRANSACTIONS WITH AMOUNT 5000 ---');
    console.log(JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error('Error running check:', error);
  }
}

find5000Tns();
