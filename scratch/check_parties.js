import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = dirname(__dirname) + '/.env';
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const serviceKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function checkDatabase() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/parties?select=*`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    const parties = await response.json();
    console.log('Parties list:');
    console.table(parties.map(p => ({ id: p.id, name: p.party_name, type: p.system_type })));

    const tnsResponse = await fetch(`${supabaseUrl}/rest/v1/transactions?select=*`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    const transactions = await tnsResponse.json();
    console.log('Transactions count:', transactions.length);
  } catch (error) {
    console.error('Error running check:', error);
  }
}
checkDatabase();
