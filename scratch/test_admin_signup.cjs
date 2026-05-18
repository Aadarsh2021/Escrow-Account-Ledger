const { createClient } = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/@supabase/supabase-js');
const dotenv = require('c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/node_modules/dotenv');

// Load .env from root workspace directory
dotenv.config({ path: 'c:/Users/thaku/OneDrive/Desktop/Work/Escrow Account Ledger/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminSignup() {
  const randomEmail = `test_admin_${Math.floor(Math.random() * 1000000)}@gmail.com`;
  console.log(`--- ADMIN CREATING USER: ${randomEmail} ---`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: randomEmail,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin Test User',
      company_name: 'Admin Test Company'
    }
  });

  if (error) {
    console.error('Admin Create User Error:', error);
  } else {
    console.log('Admin Create User Succeeded!', data);
    
    // Clean up
    console.log('Cleaning up user...');
    await supabase.auth.admin.deleteUser(data.user.id);
    console.log('Clean up done.');
  }
}

testAdminSignup();
