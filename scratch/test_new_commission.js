import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // 1. Fetch parties to find AQC (company) and VIPUL (selected party)
  const { data: parties } = await supabase
    .from('parties')
    .select('*')
    .eq('user_id', '9a5e92ee-c6b1-49de-9126-f86488da58ac');
  
  const companyParty = parties.find(p => p.system_type === 'company');
  const selectedParty = parties.find(p => p.party_name === 'VIPUL');
  
  console.log('Company:', companyParty.party_name, 'ID:', companyParty.id);
  console.log('Selected Party:', selectedParty.party_name, 'ID:', selectedParty.id);

  // 2. Fetch active transactions for selectedParty
  const { data: activeTns } = await supabase
    .from('transactions')
    .select('*')
    .eq('party_id', selectedParty.id)
    .neq('is_finalized', true);

  // 3. Resolve partner names for active transactions
  const linkedIds = activeTns.map(t => t.linked_transaction_id).filter(Boolean);
  const { data: partnerData } = await supabase
    .from('transactions')
    .select('linked_transaction_id, party_id, parties(party_name, system_type)')
    .in('linked_transaction_id', linkedIds)
    .neq('party_id', selectedParty.id);

  const partnerMap = new Map();
  partnerData.forEach((p) => {
    if (p.parties?.system_type !== 'commission' || !partnerMap.has(p.linked_transaction_id)) {
      partnerMap.set(p.linked_transaction_id, p.parties?.party_name || 'System');
    }
  });

  activeTns.forEach(t => {
    if (t.linked_transaction_id) {
      t.partner_party_name = partnerMap.get(t.linked_transaction_id);
    }
  });

  // Filter out settlement and commission records
  const mainTns = activeTns.filter(t => !t.is_settlement && t.remarks?.toUpperCase() !== 'COMMISSION');

  // Filter for company transactions
  const companyTns = mainTns.filter(t => t.partner_party_name === companyParty.party_name);

  console.log('\n--- Original logic calculations ---');
  console.log('Total VIPUL unfinalized tns with AQC:', companyTns.length);
  const originalVolume = companyTns.reduce((sum, t) => sum + t.credit, 0);
  console.log('Original Volume:', originalVolume);
  console.log('Original Commission (1%):', (originalVolume * 1) / 100);

  // 4. New logic: Query company's finalized status for these transactions
  console.log('\n--- Proposed logic calculations ---');
  const companyTnsIds = companyTns.map(t => t.linked_transaction_id);
  const { data: companySideTns } = await supabase
    .from('transactions')
    .select('linked_transaction_id, is_finalized')
    .eq('party_id', companyParty.id)
    .in('linked_transaction_id', companyTnsIds);

  const companyFinalizedMap = new Map();
  companySideTns?.forEach(ct => {
    companyFinalizedMap.set(ct.linked_transaction_id, ct.is_finalized);
  });

  const activeCompanyTns = companyTns.filter(t => !companyFinalizedMap.get(t.linked_transaction_id));
  console.log('Active Company side tns with VIPUL:', activeCompanyTns.length);
  activeCompanyTns.forEach(t => {
    console.log(`Transaction Date: ${t.transaction_date}, Credit: ${t.credit}`);
  });

  const proposedVolume = activeCompanyTns.reduce((sum, t) => sum + t.credit, 0);
  console.log('Proposed Volume:', proposedVolume);
  console.log('Proposed Commission (1%):', (proposedVolume * 1) / 100);
}

main();
