const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
// Use SERVICE_ROLE_KEY to bypass Row Level Security (RLS)
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function checkDatabase() {
  console.log('Connecting to Supabase URL:', supabaseUrl);
  
  try {
    // 1. Fetch parties
    const partiesResponse = await fetch(`${supabaseUrl}/rest/v1/parties?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!partiesResponse.ok) {
      throw new Error(`Failed to fetch parties: ${await partiesResponse.text()}`);
    }
    
    const parties = await partiesResponse.json();
    console.log('\n--- PARTIES RECORDS IN DATABASE ---');
    console.table(parties.map(p => ({
      id: p.id,
      name: p.party_name || p.name,
      sr_no: p.sr_no,
      monday_final: p.monday_final,
      system_type: p.system_type
    })));

    // 2. Fetch transactions count
    const tnsResponse = await fetch(`${supabaseUrl}/rest/v1/transactions?select=id,party_id,is_finalized`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (tnsResponse.ok) {
      const transactions = await tnsResponse.json();
      console.log('\n--- TRANSACTIONS STATISTICS ---');
      console.log('Total transactions:', transactions.length);
      console.log('Finalized transactions:', transactions.filter(t => t.is_finalized).length);
      
      const partyTnsCount = {};
      transactions.forEach(t => {
        partyTnsCount[t.party_id] = (partyTnsCount[t.party_id] || 0) + 1;
      });
      
      console.log('\nTransaction count per party:');
      console.table(parties.map(p => ({
        name: p.party_name || p.name,
        transactionsCount: partyTnsCount[p.id] || 0
      })));
    } else {
      console.log('Could not fetch transactions count.');
    }
    
  } catch (error) {
    console.error('Error running check:', error);
  }
}

checkDatabase();
