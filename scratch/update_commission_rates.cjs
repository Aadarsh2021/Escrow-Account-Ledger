const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function updateRates() {
  console.log('Connecting to Supabase URL:', supabaseUrl);
  
  try {
    // Perform update
    const response = await fetch(`${supabaseUrl}/rest/v1/parties?commission_rate=eq.3`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        commission_rate: 3.5
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update rates: ${await response.text()}`);
    }
    
    const updatedParties = await response.json();
    console.log('\n--- UPDATED PARTIES ---');
    console.log(updatedParties);
    
    // Print new list
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/parties?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const parties = await checkResponse.json();
    console.log('\n--- ALL PARTIES NOW ---');
    console.table(parties.map(p => ({
      'SR No': p.sr_no,
      'Party Name': p.party_name || p.name,
      'Status (Type)': p.status,
      'Comm Type': p.commission_type,
      'Comm Rate (%)': p.commission_rate
    })));
  } catch (error) {
    console.error('Error updating rates:', error);
  }
}

updateRates();
