const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: parties, error: pErr } = await supabase.from('parties').select('*');
    if (pErr) throw pErr;

    console.log('--- ALL PARTIES IN DATABASE ---');
    parties.forEach(p => {
      console.log(`ID: ${p.id} | Name: "${p.party_name}" | SrNo: ${p.sr_no} | SysType: ${p.system_type} | OwnerID: ${p.user_id}`);
    });

  } catch (err) {
    console.error(err);
  }
}

run();
