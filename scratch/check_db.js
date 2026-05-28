import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkParties() {
  console.log('Fetching parties...');
  const { data, error } = await supabase.from('parties').select('*');
  if (error) {
    console.error('Error fetching parties:', error);
  } else {
    console.log(`Successfully fetched ${data.length} parties.`);
    if (data.length > 0) {
      console.log('First 5 parties:', data.slice(0, 5).map(p => ({
        id: p.id,
        party_name: p.party_name,
        status: p.status,
        system_type: p.system_type,
        commission_rate: p.commission_rate
      })));
    }
  }
}

checkParties();
