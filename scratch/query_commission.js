const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    // 1. Get all parties to find Ankit Kumar and Vipul
    const { data: parties, error: pErr } = await supabase.from('parties').select('*');
    if (pErr) throw pErr;

    const ankit = parties.find(p => p.party_name.toLowerCase().includes('ankit'));
    const vipul = parties.find(p => p.party_name.toLowerCase().includes('vipul'));
    const company = parties.find(p => p.system_type === 'company');

    console.log('Ankit Kumar Party:', ankit);
    console.log('Vipul Party:', vipul);
    console.log('Company Party:', company);

    if (!ankit) {
      console.log('Could not find party named Ankit Kumar');
      return;
    }

    // 2. Fetch active transactions for Ankit Kumar
    const { data: tnsData, error: tnsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('party_id', ankit.id)
      .neq('is_finalized', true)
      .order('transaction_date', { ascending: true });

    if (tnsError) throw tnsError;

    console.log(`\nActive Transactions for ${ankit.party_name} (Total: ${tnsData.length}):`);
    
    // Resolve partner names
    const linkedIds = tnsData.map(t => t.linked_transaction_id).filter(Boolean);
    let partnerMap = new Map();
    if (linkedIds.length > 0) {
      const { data: partnerData } = await supabase
        .from('transactions')
        .select('linked_transaction_id, party_id, parties(party_name, system_type)')
        .in('linked_transaction_id', linkedIds)
        .neq('party_id', ankit.id);
      
      if (partnerData) {
        partnerData.forEach((p) => {
          if (p.parties?.system_type !== 'commission' || !partnerMap.has(p.linked_transaction_id)) {
            partnerMap.set(p.linked_transaction_id, p.parties?.party_name || 'System');
          }
        });
      }
    }

    tnsData.forEach(t => {
      t.partner_party_name = partnerMap.get(t.linked_transaction_id) || '-';
      console.log(`Date: ${t.transaction_date.slice(0, 10)} | Type: ${t.tns_type} | Partner: ${t.partner_party_name} | Credit: ${t.credit} | Debit: ${t.debit} | Remarks: ${t.remarks}`);
    });

    // 3. Commission logic simulation for selectedParty (Ankit)
    const transactions = tnsData;
    const isTake = ankit.status === 'take';
    const lastCommIdx = [...transactions].reverse().findIndex(t => t.remarks?.toUpperCase() === 'COMMISSION');
    const uncommissionedTns = lastCommIdx === -1 
      ? transactions 
      : transactions.slice(transactions.length - lastCommIdx);
    const mainTns = uncommissionedTns.filter(t => !t.is_settlement && t.remarks?.toUpperCase() !== 'COMMISSION');
    
    let totalVolume = 0;
    if (isTake) {
      // Find last debit transaction index in main transactions
      const lastDebitIdx = [...mainTns].reverse().findIndex(t => t.debit > 0);
      const uncommissionedCredits = lastDebitIdx === -1 
        ? mainTns 
        : mainTns.slice(mainTns.length - lastDebitIdx);
      
      console.log('\n--- Take Mode Commission Calculation ---');
      console.log('Uncommissioned Main Transactions:', mainTns.length);
      console.log('Last Debit Index in reversed mainTns:', lastDebitIdx);
      console.log('Transactions since last debit (credits only):', uncommissionedCredits.map(u => ({ date: u.transaction_date, partner: u.partner_party_name, credit: u.credit })));
      
      totalVolume = uncommissionedCredits.reduce((sum, t) => sum + t.credit, 0);
    } else {
      console.log('\n--- Give Mode Commission Calculation ---');
      if (company) {
        const companyTns = mainTns.filter(t => t.partner_party_name === company.party_name);
        const companyTnsIds = companyTns.map(ct => ct.linked_transaction_id).filter(Boolean);
        
        console.log('Company Name:', company.party_name);
        console.log('Company Transactions:', companyTns.map(c => ({ date: c.transaction_date, credit: c.credit })));

        if (companyTnsIds.length > 0) {
          const { data: companySideTns } = await supabase
            .from('transactions')
            .select('linked_transaction_id, is_finalized')
            .eq('party_id', company.id)
            .in('linked_transaction_id', companyTnsIds);
          
          const companyFinalizedMap = new Map();
          companySideTns?.forEach(ct => {
            if (ct.linked_transaction_id) {
              companyFinalizedMap.set(ct.linked_transaction_id, ct.is_finalized || false);
            }
          });
          
          const activeCompanyTns = companyTns.filter(t => !t.linked_transaction_id || !companyFinalizedMap.get(t.linked_transaction_id));
          console.log('Active Company Transactions (unfinalized on company side):', activeCompanyTns.map(c => ({ date: c.transaction_date, credit: c.credit })));
          
          totalVolume = activeCompanyTns.reduce((sum, t) => sum + t.credit, 0);
        } else {
          totalVolume = 0;
        }
      } else {
        totalVolume = 0;
      }
    }

    const calculatedComm = (totalVolume * ankit.commission_rate) / 100;
    console.log(`\nVolume for Commission: ${totalVolume}`);
    console.log(`Commission Rate: ${ankit.commission_rate}%`);
    console.log(`Calculated Commission: ₹${calculatedComm.toFixed(2)}`);

  } catch (err) {
    console.error(err);
  }
}

run();
