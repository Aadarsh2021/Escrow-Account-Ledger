import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdm16Y3NocGdmdGxiamRtdnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MTcyNzgsImV4cCI6MjA5NDM5MzI3OH0.OEHKBP7nUmLXb3e0vssNAmYhyyGiaXRK2e6tHB6swNA';

const supabase = createClient(supabaseUrl, anonKey);

async function testAnonUpdate() {
  console.log('Testing anon update on transactions...');

  // Try updating with anon client
  const ids = [
    '90a7eeeb-d532-444d-8437-61b771f3befd',
    '92e3f8fe-a6aa-4c4a-972d-28778ae62a2c',
    'a5147cf1-b2a6-480c-a58d-d51c4f66a916',
    '68b29099-bedd-4379-9cbd-7358957a81f5',
    '937b7172-2e0a-4268-add6-4fdd7119730a',
    '5cb0d37a-1d2b-41dc-a0f5-45d18cd4f011'
  ];

  const { data, error } = await supabase
    .from('transactions')
    .update({ is_checked: true })
    .in('id', ids);

  console.log('Anon in update result:', { data, error });

  const { data: d2, error: e2 } = await supabase
    .from('transactions')
    .update({ is_checked: true })
    .eq('id', '92e3f8fe-a6aa-4c4a-972d-28778ae62a2c');

  console.log('Anon eq update result:', { data: d2, error: e2 });
}

testAnonUpdate();
