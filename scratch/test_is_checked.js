import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdm16Y3NocGdmdGxiamRtdnRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgxNzI3OCwiZXhwIjoyMDk0MzkzMjc4fQ.BBEXYvRXJ3zHz5eGM44dTIt5vZLFPJeLb8AXpRwqBcE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectTransactions() {
  console.log('Testing transaction update on is_checked...');

  const { data: tns, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, party_id, is_checked')
    .limit(1);

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  console.log('Sample transaction:', tns);

  if (tns && tns.length > 0) {
    const targetId = tns[0].id;
    const currentVal = tns[0].is_checked;

    console.log(`Updating transaction ${targetId} is_checked to ${!currentVal}...`);
    const { data: updateRes, error: updateErr } = await supabase
      .from('transactions')
      .update({ is_checked: !currentVal })
      .eq('id', targetId)
      .select();

    if (updateErr) {
      console.error('Update error:', updateErr);
    } else {
      console.log('Update success! Returned:', updateRes);
      // Revert
      await supabase.from('transactions').update({ is_checked: currentVal }).eq('id', targetId);
    }
  }
}

inspectTransactions();
