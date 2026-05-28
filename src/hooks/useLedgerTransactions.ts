import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Party {
  id: string;
  party_name: string;
  sr_no: string;
  status: 'take' | 'give';
  commission_rate: number;
  monday_final: boolean;
  system_type: 'normal' | 'commission' | 'company';
}

export interface Transaction {
  id: string;
  transaction_date: string;
  remarks: string;
  tns_type: 'CR' | 'DR';
  credit: number;
  debit: number;
  balance: number;
  linked_transaction_id?: string;
  partner_party_name?: string;
  partner_system_type?: 'normal' | 'commission' | 'company';
  is_settlement?: boolean;
  is_finalized?: boolean;
  settlement_id?: string;
}

const generateUUID = () => {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
};

interface UseLedgerTransactionsProps {
  selectedParty: Party | null;
  authUser: any;
  parties: Party[];
  fetchParties: () => Promise<void>;
  isOldRecordsView: boolean;
  setConfirmDialog: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'success';
    onConfirm: () => void;
  }>>;
}

export const useLedgerTransactions = ({
  selectedParty,
  authUser,
  parties,
  fetchParties,
  isOldRecordsView,
  setConfirmDialog
}: UseLedgerTransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [printTransactions, setPrintTransactions] = useState<Transaction[]>([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [selectedTnsIds, setSelectedTnsIds] = useState<Set<string>>(new Set());
  const [selectedPartyIds, setSelectedPartyIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // DC Report Modal States
  const [isDcModalOpen, setIsDcModalOpen] = useState(false);
  const [dcFromDate, setDcFromDate] = useState('');
  const [dcToDate, setDcToDate] = useState('');
  const [isDcLoading, setIsDcLoading] = useState(false);
  const [dcReportData, setDcReportData] = useState<{ credit: number; debit: number; balance: number } | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditLinkedSearchOpen, setIsEditLinkedSearchOpen] = useState(false);
  const [editHighlightedIndex, setEditHighlightedIndex] = useState(0);
  const [editFormData, setEditFormData] = useState<{
    remarks: string;
    amount: string;
    linkedParty: Party | null;
    linkedSearch: string;
  }>({ remarks: '', amount: '', linkedParty: null, linkedSearch: '' });

  const getBalance = async (partyId: string) => {
    const { data } = await supabase
      .from('transactions')
      .select('balance')
      .eq('party_id', partyId)
      .order('transaction_date', { ascending: false })
      .limit(1);
    return data?.[0]?.balance || 0;
  };

  const fetchTransactions = async (partyId: string, showArchived: boolean = false) => {
    try {
      const { data: tnsData, error: tnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', partyId)
        .filter('is_finalized', showArchived ? 'eq' : 'neq', true)
        .order('transaction_date', { ascending: true });
        
      if (tnsError) throw tnsError;
      
      const currentTns = (tnsData || []) as Transaction[];
      const linkedIds = currentTns.map(t => t.linked_transaction_id).filter(Boolean) as string[];
      if (linkedIds.length > 0) {
        const { data: partnerData } = await supabase
          .from('transactions')
          .select('linked_transaction_id, party_id, parties(party_name, system_type)')
          .in('linked_transaction_id', linkedIds)
          .neq('party_id', partyId);
        
        if (partnerData) {
          const partnerNameMap = new Map<string, string>();
          const partnerTypeMap = new Map<string, string>();
          partnerData.forEach((p: any) => {
            if (p.parties?.system_type !== 'commission' || !partnerNameMap.has(p.linked_transaction_id)) {
              partnerNameMap.set(p.linked_transaction_id, p.parties?.party_name || 'System');
              partnerTypeMap.set(p.linked_transaction_id, p.parties?.system_type || 'normal');
            }
          });
          
          currentTns.forEach(t => {
            if (t.linked_transaction_id) {
              t.partner_party_name = partnerNameMap.get(t.linked_transaction_id);
              t.partner_system_type = partnerTypeMap.get(t.linked_transaction_id) as any;
            }
          });
        }
      }

      setTransactions(currentTns);
      if (!showArchived) {
        setClosingBalance(currentTns.length > 0 ? currentTns[currentTns.length - 1].balance : 0);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const fetchAllTransactionsForPrint = async (partyId: string) => {
    try {
      const { data: tnsData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', partyId)
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const currentTns = (tnsData || []) as Transaction[];
      const linkedIds = currentTns.map(t => t.linked_transaction_id).filter(Boolean) as string[];
      if (linkedIds.length > 0) {
        const { data: partnerData } = await supabase
          .from('transactions')
          .select('linked_transaction_id, party_id, parties(party_name, system_type)')
          .in('linked_transaction_id', linkedIds)
          .neq('party_id', partyId);
        
        if (partnerData) {
          const partnerNameMap = new Map<string, string>();
          const partnerTypeMap = new Map<string, string>();
          partnerData.forEach((p: any) => {
            if (p.parties?.system_type !== 'commission' || !partnerNameMap.has(p.linked_transaction_id)) {
              partnerNameMap.set(p.linked_transaction_id, p.parties?.party_name || 'System');
              partnerTypeMap.set(p.linked_transaction_id, p.parties?.system_type || 'normal');
            }
          });
          
          currentTns.forEach(t => {
            if (t.linked_transaction_id) {
              t.partner_party_name = partnerNameMap.get(t.linked_transaction_id);
              t.partner_system_type = partnerTypeMap.get(t.linked_transaction_id) as any;
            }
          });
        }
      }
      setPrintTransactions(currentTns);
    } catch (err) {
      console.error('Error fetching print transactions:', err);
    }
  };

  const recalculateBalances = async (partyId: string) => {
    try {
      const { data: activeTns, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', partyId)
        .neq('is_finalized', true)
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!activeTns || activeTns.length === 0) return;

      let runningBalance = 0;
      const updates = [];

      for (let i = 0; i < activeTns.length; i++) {
        const t = activeTns[i];
        if (t.is_settlement) {
          runningBalance = t.balance;
        } else {
          runningBalance = runningBalance + t.credit - t.debit;
          if (t.balance !== runningBalance) {
            updates.push({ id: t.id, balance: runningBalance });
          }
        }
      }

      if (updates.length > 0) {
        await Promise.all(
          updates.map(update =>
            supabase
              .from('transactions')
              .update({ balance: update.balance })
              .eq('id', update.id)
          )
        );
      }
    } catch (err) {
      console.error('Error recalculating balances:', err);
    }
  };

  const handleMondayFinal = async () => {
    if (!selectedParty || submitting) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Monday Final Settlement',
      message: `Are you sure you want to finalize ${selectedParty.party_name}'s account? This will settle all active entries into a single summary record and archive the history.`,
      type: 'success',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        try {
          const { data: latestTns, error: fErr } = await supabase
            .from('transactions')
            .select('*')
            .eq('party_id', selectedParty.id)
            .neq('is_finalized', true)
            .order('transaction_date', { ascending: true });

          if (fErr) throw fErr;
          if (!latestTns || latestTns.length === 0) {
            const { error: updateErr } = await supabase
              .from('parties')
              .update({ monday_final: true })
              .eq('id', selectedParty.id);

            if (updateErr) throw updateErr;

            await fetchParties();
            setTimeout(() => {
              fetchTransactions(selectedParty.id);
              fetchAllTransactionsForPrint(selectedParty.id);
            }, 500);
            return;
          }

          const closingBal = latestTns[latestTns.length - 1].balance;

          const { error: rpcError } = await supabase.rpc('execute_monday_final', {
            p_party_id: selectedParty.id,
            p_user_id: authUser?.id || null,
            p_closing_balance: closingBal,
            p_remarks: 'MONDAY FINAL SETTLEMENT'
          });

          if (rpcError) throw rpcError;

          await fetchParties();
          setTimeout(() => {
            fetchTransactions(selectedParty.id);
            fetchAllTransactionsForPrint(selectedParty.id);
          }, 500);
        } catch (err) {
          console.error('Monday Final Error:', err);
          alert('Failed to finalize: ' + (err as any).message);
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleBulkMondayFinal = async () => {
    if (selectedPartyIds.size === 0 || submitting) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Bulk Monday Final',
      message: `Are you sure you want to finalize ${selectedPartyIds.size} selected accounts? This action will settle and archive active transactions for all selected parties.`,
      type: 'success',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        try {
          const partyIds = Array.from(selectedPartyIds);
          
          await Promise.all(partyIds.map(async (pId) => {
            const { data: activeTns, error: fetchErr } = await supabase
              .from('transactions')
              .select('*')
              .eq('party_id', pId)
              .neq('is_finalized', true)
              .order('transaction_date', { ascending: true });

            if (fetchErr) throw fetchErr;

            if (activeTns && activeTns.length > 0) {
              const closingBal = activeTns[activeTns.length - 1].balance;

              const { error: rpcError } = await supabase.rpc('execute_monday_final', {
                p_party_id: pId,
                p_user_id: authUser?.id || null,
                p_closing_balance: closingBal,
                p_remarks: 'MONDAY FINAL SETTLEMENT (BULK)'
              });
              
              if (rpcError) throw rpcError;
            } else {
              const { error: updateErr } = await supabase
                .from('parties')
                .update({ monday_final: true })
                .eq('id', pId);

              if (updateErr) throw updateErr;
            }
          }));
          
          setSelectedPartyIds(new Set());
          await fetchParties();
        } catch (err) {
          console.error('Bulk Monday Final Error:', err);
          alert('Failed to complete bulk settlement.');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleDeleteTns = async () => {
    if (selectedTnsIds.size === 0 || !selectedParty || submitting || isOldRecordsView) return;

    const hasSettlement = Array.from(selectedTnsIds).some(id => {
      const t = transactions.find(item => item.id === id);
      return t?.is_settlement === true;
    });

    if (hasSettlement) {
      alert('Monday Final settlement records cannot be deleted once created.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Transactions',
      message: `Are you sure you want to delete ${selectedTnsIds.size} selected transactions? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        try {
          const selectedEntries = transactions.filter(t => selectedTnsIds.has(t.id));
          const allAnchorIds = new Set<string>();
          selectedEntries?.forEach(e => { allAnchorIds.add(e.linked_transaction_id || e.id); });
          
          const { data: tnsToDelete } = await supabase
            .from('transactions')
            .select('party_id')
            .or(`id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')}),linked_transaction_id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')})`);
          
          const affectedPartyIds = new Set<string>([selectedParty.id, ...(tnsToDelete?.map(t => t.party_id) || [])]);

          const { error } = await supabase
            .from('transactions')
            .delete()
            .or(`id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')}),linked_transaction_id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')})`);
            
          if (error) throw error;

          await Promise.all(Array.from(affectedPartyIds).map(pId => recalculateBalances(pId)));

          setSelectedTnsIds(new Set());
          await Promise.all([
            fetchParties(),
            selectedParty ? fetchTransactions(selectedParty.id) : Promise.resolve(),
            selectedParty ? fetchAllTransactionsForPrint(selectedParty.id) : Promise.resolve()
          ]);
        } catch (err) { 
          console.error(err); 
          alert("Failed to delete records. " + (err as any).message);
        } finally { 
          setSubmitting(false); 
        }
      }
    });
  };

  const saveModification = async () => {
    if (selectedTnsIds.size !== 1 || !selectedParty || !editFormData.linkedParty || !authUser || submitting) return;
    const tnsId = Array.from(selectedTnsIds)[0];
    const tnsA = transactions.find(t => t.id === tnsId);
    if (!tnsA) return;

    const parsedAmt = parseFloat(editFormData.amount);
    const numAmt = Math.sign(parsedAmt) * Math.round(Math.abs(parsedAmt));
    if (isNaN(numAmt) || numAmt === 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const anchorId = tnsA.linked_transaction_id || tnsA.id;

      const { data: tnsToModify } = await supabase
        .from('transactions')
        .select('party_id')
        .eq('linked_transaction_id', anchorId);
      
      const affectedPartyIds = new Set<string>([
        selectedParty.id,
        editFormData.linkedParty.id,
        ...(tnsToModify?.map(t => t.party_id) || [])
      ]);

      const absAmt = Math.abs(numAmt);
      const primaryType = numAmt > 0 ? 'CR' : 'DR';
      const secondaryType = numAmt > 0 ? 'DR' : 'CR';

      const { error: delError } = await supabase
        .from('transactions')
        .delete()
        .eq('linked_transaction_id', anchorId);
      
      if (delError) throw delError;

      const [balA, balB] = await Promise.all([
        getBalance(selectedParty.id),
        getBalance(editFormData.linkedParty.id)
      ]);

      const creditA = primaryType === 'CR' ? absAmt : 0;
      const debitA = primaryType === 'DR' ? absAmt : 0;
      const newBalA = balA + creditA - debitA;

      const creditB = secondaryType === 'CR' ? absAmt : 0;
      const debitB = secondaryType === 'DR' ? absAmt : 0;
      const newBalB = balB + creditB - debitB;

      const { error: insertErr } = await supabase.from('transactions').insert([
        {
          id: anchorId,
          user_id: authUser.id,
          party_id: selectedParty.id,
          linked_transaction_id: anchorId,
          remarks: editFormData.remarks || '',
          tns_type: primaryType,
          credit: creditA,
          debit: debitA,
          balance: newBalA
        },
        {
          id: generateUUID(),
          user_id: authUser.id,
          party_id: editFormData.linkedParty.id,
          linked_transaction_id: anchorId,
          remarks: editFormData.remarks || '',
          tns_type: secondaryType,
          credit: creditB,
          debit: debitB,
          balance: newBalB
        }
      ]);

      if (insertErr) throw insertErr;

      await Promise.all(Array.from(affectedPartyIds).map(pId => recalculateBalances(pId)));

      setIsEditModalOpen(false);
      setSelectedTnsIds(new Set());
      await Promise.all([
        fetchParties(),
        fetchTransactions(selectedParty.id),
        fetchAllTransactionsForPrint(selectedParty.id)
      ]);
    } catch (err) {
      console.error(err);
      alert('Modification failed: ' + ((err as any).message || 'Unknown database error'));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDcReport = async () => {
    if (!selectedParty || !dcFromDate || !dcToDate) return;
    setIsDcLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('credit, debit, tns_type')
        .eq('party_id', selectedParty.id)
        .gte('transaction_date', `${dcFromDate}T00:00:00.000Z`)
        .lte('transaction_date', `${dcToDate}T23:59:59.999Z`);
        
      if (error) throw error;
      
      let totalCredit = 0;
      let totalDebit = 0;
      
      if (data) {
        data.forEach(t => {
          totalCredit += Number(t.credit);
          totalDebit += Number(t.debit);
        });
      }
      
      setDcReportData({
        credit: totalCredit,
        debit: totalDebit,
        balance: totalCredit - totalDebit
      });
    } catch (err) {
      console.error('Error fetching DC report:', err);
      alert('Failed to fetch DC report');
    } finally {
      setIsDcLoading(false);
    }
  };

  const handleModifyTns = async () => {
    if (selectedTnsIds.size !== 1 || isOldRecordsView || !selectedParty || submitting) return;
    const tnsId = Array.from(selectedTnsIds)[0];
    const tnsA = transactions.find(t => t.id === tnsId);
    if (!tnsA) return;

    if (tnsA.is_settlement) {
      alert('Monday Final settlement records cannot be modified once created.');
      return;
    }

    setSubmitting(true);
    try {
      const anchorId = tnsA.linked_transaction_id || tnsA.id;
      // Fetch all transactions in the group to identify partner
      const { data: pair, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('linked_transaction_id', anchorId);

      if (error) throw error;

      const pairPartyIds = pair?.map(t => t.party_id) || [];
      const { data: pairParties } = await supabase
        .from('parties')
        .select('*')
        .in('id', pairPartyIds);

      const companyPartyObj = pairParties?.find(p => p.system_type === 'company');
      const commissionPartyObj = pairParties?.find(p => p.system_type === 'commission');
      const partnerPartyObj = pairParties?.find(p => p.id !== selectedParty.id && p.system_type !== 'commission');

      let initialLinkedParty: Party | null = null;
      let initialAmountVal = 0;

      if (companyPartyObj && commissionPartyObj) {
        // It's a 3-way split!
        initialLinkedParty = companyPartyObj as Party;
        const compTns = pair?.find(t => t.party_id === companyPartyObj.id);
        // The full amount is the debit of the company party
        initialAmountVal = compTns ? (compTns.debit > 0 ? compTns.debit : -compTns.credit) : 0;
      } else {
        // It's a normal 2-way transaction
        if (partnerPartyObj) {
          initialLinkedParty = partnerPartyObj as Party;
        }
        initialAmountVal = tnsA.credit > 0 ? tnsA.credit : -tnsA.debit;
      }

      setEditFormData({
        remarks: tnsA.remarks || '',
        amount: initialAmountVal.toString(),
        linkedParty: initialLinkedParty,
        linkedSearch: initialLinkedParty ? initialLinkedParty.party_name : ''
      });
      setIsEditModalOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load transaction details.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectEditLinkedParty = async (party: Party) => {
    const prevLinkedParty = editFormData.linkedParty;
    setEditFormData(prev => ({
      ...prev,
      linkedParty: party,
      linkedSearch: party.party_name
    }));
    setIsEditLinkedSearchOpen(false);
    if (party.system_type === 'commission' && selectedParty) {
      const isTake = selectedParty.status === 'take';
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
        const companyParty = parties.find(p => p.system_type === 'company');
        if (companyParty) {
          const companyTns = mainTns.filter(t => t.partner_party_name === companyParty.party_name);
          const companyTnsIds = companyTns.map(ct => ct.linked_transaction_id).filter(Boolean) as string[];
          
          if (companyTnsIds.length > 0) {
            const { data: companySideTns } = await supabase
              .from('transactions')
              .select('linked_transaction_id, is_finalized')
              .eq('party_id', companyParty.id)
              .in('linked_transaction_id', companyTnsIds);
            
            const companyFinalizedMap = new Map<string, boolean>();
            companySideTns?.forEach(ct => {
              if (ct.linked_transaction_id) {
                companyFinalizedMap.set(ct.linked_transaction_id, ct.is_finalized || false);
              }
            });
            
            const activeCompanyTns = companyTns.filter(t => !t.linked_transaction_id || !companyFinalizedMap.get(t.linked_transaction_id));
            totalVolume = activeCompanyTns.reduce((sum, t) => sum + t.credit, 0);
          } else {
            totalVolume = 0;
          }
        } else {
          totalVolume = 0;
        }
      }
      
      const calculatedComm = Math.round((totalVolume * selectedParty.commission_rate) / 100);
      
      const amountSign = isTake ? '-' : '';
      setEditFormData(prev => ({
        ...prev,
        amount: `${amountSign}${calculatedComm}`,
        remarks: ''
      }));
    } else {
      if (prevLinkedParty?.system_type === 'commission') {
        setEditFormData(prev => ({
          ...prev,
          amount: '',
          remarks: ''
        }));
      }
    }
  };

  const calculateCommission = async () => {
    if (!selectedParty) return { amount: '', remarks: '' };
    const isTake = selectedParty.status === 'take';
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
      const companyParty = parties.find(p => p.system_type === 'company');
      if (companyParty) {
        const companyTns = mainTns.filter(t => t.partner_party_name === companyParty.party_name);
        const companyTnsIds = companyTns.map(ct => ct.linked_transaction_id).filter(Boolean) as string[];
        
        if (companyTnsIds.length > 0) {
          const { data: companySideTns } = await supabase
            .from('transactions')
            .select('linked_transaction_id, is_finalized')
            .eq('party_id', companyParty.id)
            .in('linked_transaction_id', companyTnsIds);
          
          const companyFinalizedMap = new Map<string, boolean>();
          companySideTns?.forEach(ct => {
            if (ct.linked_transaction_id) {
              companyFinalizedMap.set(ct.linked_transaction_id, ct.is_finalized || false);
            }
          });
          
          const activeCompanyTns = companyTns.filter(t => !t.linked_transaction_id || !companyFinalizedMap.get(t.linked_transaction_id));
          totalVolume = activeCompanyTns.reduce((sum, t) => sum + t.credit, 0);
        } else {
          totalVolume = 0;
        }
      } else {
        totalVolume = 0;
      }
    }
    
    const calculatedComm = Math.round((totalVolume * selectedParty.commission_rate) / 100);
    const amountSign = isTake ? '-' : '';
    return {
      amount: `${amountSign}${calculatedComm}`,
      remarks: ''
    };
  };

  const createTransactionEntry = async (amountVal: string, remarksVal: string, linkedPartyVal: Party) => {
    if (!selectedParty || !amountVal || parseFloat(amountVal) === 0 || !linkedPartyVal || !authUser) return false;
    setSubmitting(true);
    const parsedAmt = parseFloat(amountVal);
    const numAmt = Math.sign(parsedAmt) * Math.round(Math.abs(parsedAmt));
    const absAmt = Math.abs(numAmt);
    try {
      const firstPartyType = numAmt > 0 ? 'CR' : 'DR';
      const secondPartyType = numAmt > 0 ? 'DR' : 'CR';

      const chainId = generateUUID();

      // Get current balances
      const [balA, balB] = await Promise.all([
        getBalance(selectedParty.id),
        getBalance(linkedPartyVal.id)
      ]);

      const creditA = firstPartyType === 'CR' ? absAmt : 0;
      const debitA = firstPartyType === 'DR' ? absAmt : 0;
      const newBalA = balA + creditA - debitA;

      const creditB = secondPartyType === 'CR' ? absAmt : 0;
      const debitB = secondPartyType === 'DR' ? absAmt : 0;
      const newBalB = balB + creditB - debitB;

      // Insert both transaction records atomically
      const { error: insertErr } = await supabase.from('transactions').insert([
        {
          id: chainId,
          user_id: authUser.id,
          party_id: selectedParty.id,
          linked_transaction_id: chainId,
          remarks: remarksVal || '',
          tns_type: firstPartyType,
          credit: creditA,
          debit: debitA,
          balance: newBalA
        },
        {
          id: generateUUID(),
          user_id: authUser.id,
          party_id: linkedPartyVal.id,
          linked_transaction_id: chainId,
          remarks: remarksVal || '',
          tns_type: secondPartyType,
          credit: creditB,
          debit: debitB,
          balance: newBalB
        }
      ]);

      if (insertErr) throw insertErr;

      // Recalculate balances to ensure everything is perfect
      await Promise.all([
        recalculateBalances(selectedParty.id),
        recalculateBalances(linkedPartyVal.id)
      ]);
      
      return true;
    } catch (err) { 
      console.error(err); 
      alert('Transaction creation failed: ' + ((err as any).message || 'Unknown database error'));
      return false;
    } finally { 
      setSubmitting(false); 
    }
  };

  return {
    transactions,
    setTransactions,
    printTransactions,
    setPrintTransactions,
    closingBalance,
    setClosingBalance,
    selectedTnsIds,
    setSelectedTnsIds,
    selectedPartyIds,
    setSelectedPartyIds,
    submitting,
    setSubmitting,
    isDcModalOpen,
    setIsDcModalOpen,
    dcFromDate,
    setDcFromDate,
    dcToDate,
    setDcToDate,
    isDcLoading,
    setIsDcLoading,
    dcReportData,
    setDcReportData,
    fetchDcReport,
    isEditModalOpen,
    setIsEditModalOpen,
    isEditLinkedSearchOpen,
    setIsEditLinkedSearchOpen,
    editHighlightedIndex,
    setEditHighlightedIndex,
    editFormData,
    setEditFormData,
    fetchTransactions,
    fetchAllTransactionsForPrint,
    recalculateBalances,
    handleMondayFinal,
    handleBulkMondayFinal,
    handleDeleteTns,
    saveModification,
    getBalance,
    handleModifyTns,
    selectEditLinkedParty,
    calculateCommission,
    createTransactionEntry
  };
};
