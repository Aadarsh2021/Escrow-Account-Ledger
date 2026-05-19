const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function checkCommissionRates() {
  console.log('Connecting to Supabase URL:', supabaseUrl);
  
  try {
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
    console.log('\n--- PARTIES COMMISSION RATES ---');
    console.table(parties.map(p => ({
      'SR No': p.sr_no,
      'Party Name': p.party_name || p.name,
      'Status (Type)': p.status,
      'System Type': p.system_type,
      'Comm Type': p.commission_type,
      'Comm Rate (%)': p.commission_rate
    })));
  } catch (error) {
    console.error('Error running check:', error);
  }
}

checkCommissionRates();
