import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  const userId = 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7'; // thakuraadarsh1@gmail.com
  console.log(`Deleting all transactions for user_id: ${userId}...`);
  
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId);
    
  if (error) {
    console.error("Error deleting transactions:", error.message);
  } else {
    console.log("Successfully deleted transactions!");
  }
  
  // Let's also check the parties for this user and make sure their monday_final is reset if any
  console.log("Resetting parties monday_final status...");
  const { error: partyErr } = await supabase
    .from('parties')
    .update({ monday_final: false })
    .eq('user_id', userId);
    
  if (partyErr) {
    console.error("Error resetting parties:", partyErr.message);
  } else {
    console.log("Successfully reset parties!");
  }
}

main().catch(console.error);
