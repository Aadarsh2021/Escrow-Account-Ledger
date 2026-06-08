import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    console.log('Querying check_transaction_lock source code from database...');
    // We can run a query to get function source using supabase RPC if we have a function to run SQL,
    // or we can select from information_schema/pg_proc since PostgREST doesn't block SELECT on catalog tables 
    // if accessed with service key. Let's try to query pg_proc.
    const { data, error } = await supabase
      .from('pg_proc')
      .select('prosrc')
      .eq('proname', 'check_transaction_lock');

    if (error) {
      console.log('PostgREST query to pg_proc failed (normal for standard RLS/API setups).');
      console.log('Let\'s test if updating a transaction is actually persistent...');
      
      // Let's verify by inserting a dummy transaction, updating it, and checking if the update sticks!
      const testPartyId = '19730eec-faad-4c47-b52e-cc55f8f5920e'; // An existing party ID
      console.log('Inserting test transaction...');
      const { data: insertData, error: insertError } = await supabase
        .from('transactions')
        .insert({
          party_id: testPartyId,
          remarks: 'TEMP TEST TRIGGER',
          tns_type: 'CR',
          credit: 100,
          debit: 0,
          balance: 100,
          is_checked: false
        })
        .select();

      if (insertError) throw insertError;
      const testTns = insertData[0];
      console.log('Inserted:', testTns.id, 'is_checked:', testTns.is_checked);

      console.log('Updating is_checked to true...');
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_checked: true })
        .eq('id', testTns.id);

      if (updateError) throw updateError;

      console.log('Fetching it back...');
      const { data: fetchedData, error: fetchError } = await supabase
        .from('transactions')
        .select('is_checked')
        .eq('id', testTns.id);

      if (fetchError) throw fetchError;
      console.log('After update, is_checked is:', fetchedData[0].is_checked);

      console.log('Deleting test transaction...');
      await supabase.from('transactions').delete().eq('id', testTns.id);

      if (fetchedData[0].is_checked === false) {
        console.log('\nWARNING: UPDATE WAS SILENTLY DISCARDED! The trigger check_transaction_lock returned OLD instead of NEW!');
      } else {
        console.log('\nSUCCESS: Update persisted successfully.');
      }
    } else {
      console.log('Function source:');
      console.log(data[0]?.prosrc);
    }
  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
