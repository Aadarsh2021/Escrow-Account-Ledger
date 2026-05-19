const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    // Let's query all parties and see what user_ids they belong to
    const res = await fetch(`${supabaseUrl}/rest/v1/parties?select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await res.json();
    
    // Group parties by user_id
    const userGroups = {};
    parties.forEach(p => {
      if (!userGroups[p.user_id]) userGroups[p.user_id] = [];
      userGroups[p.user_id].push(p);
    });

    console.log("=== User IDs and Parties ===");
    for (const [userId, plist] of Object.entries(userGroups)) {
      console.log(`\nUser ID: ${userId}`);
      console.log(`Parties:`, plist.map(p => ({
        id: p.id,
        name: p.party_name,
        system_type: p.system_type,
        rate: p.commission_rate
      })));
    }
  } catch (err) {
    console.error(err);
  }
}
run();
