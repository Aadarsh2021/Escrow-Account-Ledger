const { createClient } = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/@supabase/supabase-js');
const dotenv = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/dotenv');

// Load .env from root workspace directory
dotenv.config({ path: 'c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminLogin() {
  console.log('--- TESTING ADMIN SIGN-IN WITH PASSWORD ---');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'escrow.bms@gmail.com',
    password: 'escrow12345'
  });

  if (error) {
    console.error('Admin Sign-in Error:', error);
  } else {
    console.log('Admin Sign-in Successful!', {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role
    });
  }
}

testAdminLogin();
