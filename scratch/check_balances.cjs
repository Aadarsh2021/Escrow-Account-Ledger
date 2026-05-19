const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  try {
    const targetUserId = '9a5e92ee-c6b1-49de-9126-f86488da58ac';
    
    // 1. Fetch parties
    const partiesRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${targetUserId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const profile = await partiesRes.json();
    console.log('=== USER PROFILE ===');
    console.log(profile);

    const partiesRes2 = await fetch(`${supabaseUrl}/rest/v1/parties?user_id=eq.${targetUserId}&select=*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const parties = await partiesRes2.json();
    console.log('=== PARTIES ===');
    console.table(parties.map(p => ({ id: p.id, name: p.party_name })));

    // 2. Fetch transactions (all)
    const tnsRes = await fetch(`${supabaseUrl}/rest/v1/transactions?user_id=eq.${targetUserId}&select=*&order=transaction_date.asc`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const transactions = await tnsRes.json();
    
    // 3. Filter for active transactions (is_finalized is not true)
    const activeTns = transactions.filter(t => t.is_finalized !== true);
    console.log('\n=== ACTIVE TRANSACTIONS ===');
    console.table(activeTns.map(t => {
      const p = parties.find(p => p.id === t.party_id);
      return {
        id: t.id,
        date: t.transaction_date,
        party: p ? p.party_name : 'Unknown',
        remarks: t.remarks,
        type: t.tns_type,
        credit: t.credit,
        debit: t.debit,
        balance: t.balance,
        is_settlement: t.is_settlement,
        linked_transaction_id: t.linked_transaction_id
      };
    }));

    // 4. Calculate latest balance per party (as done in BalanceSheet.tsx)
    const latestBalances = new Map();
    // We order descending by transaction_date, then created_at to find the latest balance
    const sortedTnsDesc = [...transactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    sortedTnsDesc.forEach(t => {
      if (!latestBalances.has(t.party_id)) {
        latestBalances.set(t.party_id, t.balance);
      }
    });

    console.log('\n=== LATEST BALANCES PER PARTY (ALL TRANSACTION HISTORY) ===');
    const balanceRows = parties.map(p => {
      const bal = latestBalances.get(p.id) || 0;
      return {
        id: p.id,
        name: p.party_name,
        balance: bal,
        side: bal > 0 ? 'CREDIT' : (bal < 0 ? 'DEBIT' : 'ZERO')
      };
    });
    console.table(balanceRows);

    const creditTotal = balanceRows.filter(r => r.balance > 0).reduce((sum, r) => sum + r.balance, 0);
    const debitTotal = balanceRows.filter(r => r.balance < 0).reduce((sum, r) => sum + Math.abs(r.balance), 0);
    console.log(`\nBalance Sheet Sum:`);
    console.log(`Credit (Jama/Dena) Total: ${creditTotal}`);
    console.log(`Debit (Name/Lena) Total: ${debitTotal}`);
    console.log(`Difference: ${creditTotal - debitTotal}`);

  } catch (err) {
    console.error(err);
  }
}
run();
