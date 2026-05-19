import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const userId = 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7'; // thakuraadarsh1@gmail.com
  console.log(`Deleting auth user: ${userId}...`);
  const { data, error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.error("Error deleting user:", error.message);
  } else {
    console.log("Successfully deleted auth user!");
  }
}

main().catch(console.error);
