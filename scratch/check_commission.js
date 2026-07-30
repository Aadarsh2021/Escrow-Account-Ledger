import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pdm16Y3NocGdmdGxiamRtdnRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgxNzI3OCwiZXhwIjoyMDk0MzkzMjc4fQ.BBEXYvRXJ3zHz5eGM44dTIt5vZLFPJeLb8AXpRwqBcE';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function simulateCommission() {
  const userId = 'd25083e1-1b6a-4675-ad3e-c9a2549ba7d7';

  // 1. Fetch parties
  const { data: parties } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', userId)
    .order('sr_no', { ascending: true });

  const companyParty = parties.find(p => p.system_type === 'company');
  const commissionParty = parties.find(p => p.system_type === 'commission');

  console.log('Company Party:', companyParty?.party_name);
  console.log('Commission Party:', commissionParty?.party_name);

  // 2. For each normal party, fetch active transactions & simulate commission calculation
  for (const party of parties.filter(p => p.system_type === 'normal')) {
    const { data: rawTns } = await supabase
      .from('transactions')
      .select('*')
      .eq('party_id', party.id)
      .filter('is_finalized', 'neq', true)
      .order('transaction_date', { ascending: true });

    const transactions = rawTns || [];

    // Partner party map
    const linkedIds = transactions.map(t => t.linked_transaction_id).filter(Boolean);
    if (linkedIds.length > 0) {
      const { data: partnerData } = await supabase
        .from('transactions')
        .select('linked_transaction_id, party_id, parties(party_name, system_type)')
        .in('linked_transaction_id', linkedIds)
        .neq('party_id', party.id);

      if (partnerData) {
        const partnerNameMap = new Map();
        const partnerTypeMap = new Map();
        partnerData.forEach((p) => {
          if (p.parties?.system_type !== 'commission' || !partnerNameMap.has(p.linked_transaction_id)) {
            partnerNameMap.set(p.linked_transaction_id, p.parties?.party_name || 'System');
            partnerTypeMap.set(p.linked_transaction_id, p.parties?.system_type || 'normal');
          }
        });

        transactions.forEach(t => {
          if (t.linked_transaction_id) {
            t.partner_party_name = partnerNameMap.get(t.linked_transaction_id);
            t.partner_system_type = partnerTypeMap.get(t.linked_transaction_id);
          }
        });
      }
    }

    const isTake = party.status === 'take';
    const lastCommIdx = [...transactions].reverse().findIndex(t => t.partner_system_type === 'commission');
    const uncommissionedTns = lastCommIdx === -1 
      ? transactions 
      : transactions.slice(transactions.length - lastCommIdx);
    const mainTns = uncommissionedTns.filter(t => !t.is_settlement && t.partner_system_type !== 'commission');

    let totalVolume = 0;
    if (isTake) {
      const lastDebitIdx = [...mainTns].reverse().findIndex(t => t.debit > 0);
      const uncommissionedCredits = lastDebitIdx === -1 
        ? mainTns 
        : mainTns.slice(mainTns.length - lastDebitIdx);
      totalVolume = uncommissionedCredits.reduce((sum, t) => sum + t.credit, 0);
    } else {
      if (companyParty) {
        const companyTns = mainTns.filter(t => t.partner_party_name === companyParty.party_name);
        const companyTnsIds = companyTns.map(ct => ct.linked_transaction_id).filter(Boolean);

        if (companyTnsIds.length > 0) {
          const { data: companySideTns } = await supabase
            .from('transactions')
            .select('linked_transaction_id, is_finalized')
            .eq('party_id', companyParty.id)
            .in('linked_transaction_id', companyTnsIds);

          const companyFinalizedMap = new Map();
          companySideTns?.forEach(ct => {
            if (ct.linked_transaction_id) {
              companyFinalizedMap.set(ct.linked_transaction_id, ct.is_finalized || false);
            }
          });

          const activeCompanyTns = companyTns.filter(t => !t.linked_transaction_id || !companyFinalizedMap.get(t.linked_transaction_id));
          totalVolume = activeCompanyTns.reduce((sum, t) => sum + t.credit, 0);
        }
      }
    }

    const calculatedComm = Math.round((totalVolume * party.commission_rate) / 100);
    const sign = isTake ? '-' : '+';
    const commType = isTake ? 'Debit/Minus (-)' : 'Credit/Plus (+)';

    console.log(`\n----------------------------------------`);
    console.log(`Party: (${party.sr_no}) ${party.party_name}`);
    console.log(`Status: ${party.status.toUpperCase()} | Comm Rate: ${party.commission_rate}%`);
    console.log(`Total Active Transactions: ${transactions.length}`);
    console.log(`Uncommissioned Volume: ₹ ${totalVolume.toLocaleString('en-IN')}`);
    console.log(`Calculated Commission Amount: ${sign}₹ ${calculatedComm.toLocaleString('en-IN')} (${commType})`);
  }
}

simulateCommission();
