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
  const usersToUpdate = [
    { email: 'thakuraadarsh1@gmail.com', id: 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7' },
    { email: 'ankitbihar5678@gmail.com', id: '9a5e92ee-c6b1-49de-9126-f86488da58ac' }
  ];

  for (const u of usersToUpdate) {
    console.log(`Updating password for ${u.email}...`);
    const { data, error } = await supabase.auth.admin.updateUserById(u.id, {
      password: 'Password123!'
    });
    if (error) {
      console.error(`Error updating ${u.email}:`, error.message);
    } else {
      console.log(`Success updating ${u.email}`);
    }
  }
}

main().catch(console.error);
