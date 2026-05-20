import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Use service role with autoRefreshToken and persistSession disabled for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

const USER_ID = '9a5e92ee-c6b1-49de-9126-f86488da58ac'; // Ankit Kumar (AQC)

async function main() {
  // Step 1: Count before deletion
  const { count: before } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', USER_ID);

  console.log(`Total transactions before deletion: ${before}`);

  // Step 2: First unlink all linked_transaction_id references to avoid FK issues
  // Set linked_transaction_id = id for all (making them self-referential temporarily)
  const { data: allTns } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', USER_ID);

  console.log(`Found ${allTns?.length} transactions to delete...`);

  // Step 3: Delete in correct order - first null out linked_transaction_id
  // to avoid self-referential FK constraint issues
  const { error: unlinkErr } = await supabase
    .from('transactions')
    .update({ linked_transaction_id: null })
    .eq('user_id', USER_ID);

  if (unlinkErr) {
    console.log('Unlink attempt:', unlinkErr.message);
  } else {
    console.log('✅ Unlinked all transaction references');
  }

  // Step 4: Now delete all
  const { error: delErr } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', USER_ID);

  if (delErr) {
    console.error('❌ Delete failed:', delErr.message);
    
    // Fallback: delete by IDs in batches
    console.log('Trying batch delete by IDs...');
    const ids = allTns?.map(t => t.id) || [];
    
    // Delete in chunks of 10
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const { error: chunkErr } = await supabase
        .from('transactions')
        .delete()
        .in('id', chunk);
      
      if (chunkErr) {
        console.error(`❌ Chunk ${i}-${i+10} failed:`, chunkErr.message);
      } else {
        console.log(`✅ Deleted chunk ${i+1} to ${Math.min(i+10, ids.length)}`);
      }
    }
  } else {
    console.log('✅ All transactions deleted successfully!');
  }

  // Step 5: Verify
  const { count: after } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', USER_ID);

  console.log(`\nTransactions after deletion: ${after}`);

  // Step 6: Reset monday_final flag on all parties
  const { error: partyErr } = await supabase
    .from('parties')
    .update({ monday_final: false })
    .eq('user_id', USER_ID);

  if (partyErr) {
    console.warn('⚠️ Party reset mein error:', partyErr.message);
  } else {
    console.log('✅ Sabhi parties ka monday_final flag reset ho gaya (fresh start).');
  }
}

main();
