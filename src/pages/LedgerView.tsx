import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Database, 
  ArrowLeft, 
  RefreshCcw, 
  Printer, 
  Plus, 
  ChevronDown, 
  ArrowRightLeft, 
  FileText,
  Calendar,
  History,
  Edit2,
  Trash2,
  CheckSquare,
  XCircle,
  Save,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface Party {
  id: string;
  party_name: string;
  sr_no: string;
  status: 'take' | 'give';
  commission_rate: number;
  monday_final: boolean;
  system_type: 'normal' | 'commission' | 'company';
}

interface Transaction {
  id: string;
  transaction_date: string;
  remarks: string;
  tns_type: 'CR' | 'DR';
  credit: number;
  debit: number;
  balance: number;
  linked_transaction_id?: string;
  partner_party_name?: string;
  is_settlement?: boolean;
  is_finalized?: boolean;
  settlement_id?: string;
}

const ITEMS_PER_PAGE = 20;

const LedgerView = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [parties, setParties] = useState<Party[]>(() => {
    try {
      const cached = localStorage.getItem('cached_parties');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_parties');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [closingBalance, setClosingBalance] = useState(0);

  const [isOldRecordsView, setIsOldRecordsView] = useState(false);
  const [selectedPartyIds, setSelectedPartyIds] = useState<Set<string>>(new Set());
  const [selectedTnsIds, setSelectedTnsIds] = useState<Set<string>>(new Set());
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'success';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });
  const [editFormData, setEditFormData] = useState<{
    remarks: string;
    amount: string;
    linkedParty: Party | null;
    linkedSearch: string;
  }>({ remarks: '', amount: '', linkedParty: null, linkedSearch: '' });
  const [isEditLinkedSearchOpen, setIsEditLinkedSearchOpen] = useState(false);
  const [editHighlightedIndex, setEditHighlightedIndex] = useState(0);
  const editLinkedSearchRef = useRef<HTMLInputElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [amount, setAmount] = useState('');
  const getAmountColorClass = () => {
    if (!amount) return 'text-blue-600';
    const val = parseFloat(amount);
    if (isNaN(val) || val === 0) return 'text-blue-600';
    return val > 0 ? 'text-emerald-600' : 'text-rose-600';
  };
  const [remarks, setRemarks] = useState('');
  const [linkedParty, setLinkedParty] = useState<Party | null>(null);
  const [linkedSearch, setLinkedSearch] = useState('');
  const [isLinkedSearchOpen, setIsLinkedSearchOpen] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const linkedSearchRef = useRef<HTMLInputElement>(null);
  const headerSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchParties();
    
    const partiesChannel = supabase.channel('ledger-parties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, () => {
        fetchParties();
      })
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsLinkedSearchOpen(false);
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) setIsEditLinkedSearchOpen(false);
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target as Node)) setIsHeaderSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      supabase.removeChannel(partiesChannel);
    };
  }, []);

  // Keep selectedParty in sync with real-time party updates
  useEffect(() => {
    if (selectedParty && parties.length > 0) {
      const updatedParty = parties.find(p => p.id === selectedParty.id);
      if (updatedParty && JSON.stringify(updatedParty) !== JSON.stringify(selectedParty)) {
        setSelectedParty(updatedParty);
      }
    }
  }, [parties, selectedParty]);

  useEffect(() => {
    if (selectedParty) {
      fetchTransactions(selectedParty.id);
      const channel = supabase.channel(`ledger-${selectedParty.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `party_id=eq.${selectedParty.id}` }, () => fetchTransactions(selectedParty.id)).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedParty]);

  const fetchParties = async () => {
    try {
      const { data, error } = await supabase.from('parties').select('*').order('party_name', { ascending: true });
      if (error) throw error;
      const cleanData = data || [];
      setParties(cleanData);
      try {
        localStorage.setItem('cached_parties', JSON.stringify(cleanData));
      } catch (e) {
        console.error('Error caching parties in Ledger:', e);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchTransactions = async (partyId: string, showArchived: boolean = false) => {
    try {
      const { data: tnsData, error: tnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('party_id', partyId)
        .filter('is_finalized', showArchived ? 'eq' : 'neq', true) // If not archived, show anything NOT true (false or null)
        .order('transaction_date', { ascending: true });
        
      if (tnsError) throw tnsError;
      
      const currentTns = tnsData || [];
      const linkedIds = currentTns.map(t => t.linked_transaction_id).filter(Boolean) as string[];
      if (linkedIds.length > 0) {
        const { data: partnerData } = await supabase.from('transactions').select('linked_transaction_id, party_id, parties(party_name)').in('linked_transaction_id', linkedIds).neq('party_id', partyId);
        
        if (partnerData) {
          const partnerMap = new Map<string, string>();
          partnerData.forEach((p: any) => {
            partnerMap.set(p.linked_transaction_id, p.parties?.party_name || 'System');
          });
          
          currentTns.forEach(t => {
            if (t.linked_transaction_id) {
              t.partner_party_name = partnerMap.get(t.linked_transaction_id);
            }
          });
        }
      }

      setTransactions(currentTns);
      // We only update closing balance if we are viewing active records
      if (!showArchived) {
        setClosingBalance(currentTns.length > 0 ? currentTns[currentTns.length - 1].balance : 0);
      }
    } catch (err) { console.error(err); }
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
        for (const update of updates) {
          await supabase
            .from('transactions')
            .update({ balance: update.balance })
            .eq('id', update.id);
        }
      }
    } catch (err) {
      console.error('Error recalculating balances:', err);
    }
  };

  const handleMondayFinal = async () => {
    if (!selectedParty || transactions.length === 0 || submitting) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Monday Final Settlement',
      message: `Are you sure you want to finalize ${selectedParty.party_name}'s account? This will settle all active entries into a single summary record and archive the history.`,
      type: 'success',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setSubmitting(true);
        try {
          // 1. Fetch FRESH active transactions to ensure we have the absolute latest
          const { data: latestTns, error: fErr } = await supabase
            .from('transactions')
            .select('*')
            .eq('party_id', selectedParty.id)
            .neq('is_finalized', true)
            .order('transaction_date', { ascending: true });

          if (fErr) throw fErr;
          if (!latestTns || latestTns.length === 0) {
            alert('No active transactions to finalize.');
            return;
          }

          const closingBal = latestTns[latestTns.length - 1].balance;

          // Call the bulletproof server-side function
          const { error: rpcError } = await supabase.rpc('execute_monday_final', {
            p_party_id: selectedParty.id,
            p_user_id: authUser?.id || null,
            p_closing_balance: closingBal,
            p_remarks: 'MONDAY FINAL SETTLEMENT'
          });

          if (rpcError) throw rpcError;

          // Refresh the ledger and the party list
          fetchParties();
          setTimeout(() => fetchTransactions(selectedParty.id), 500);
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
          
          for (const pId of partyIds) {
            const { data: activeTns } = await supabase
              .from('transactions')
              .select('*')
              .eq('party_id', pId)
              .neq('is_finalized', true)
              .order('transaction_date', { ascending: true });

            if (activeTns && activeTns.length > 0) {
              const closingBal = activeTns[activeTns.length - 1].balance;

              const { error: rpcError } = await supabase.rpc('execute_monday_final', {
                p_party_id: pId,
                p_user_id: authUser?.id || null,
                p_closing_balance: closingBal,
                p_remarks: 'MONDAY FINAL SETTLEMENT (BULK)'
              });
              
              if (rpcError) throw rpcError;
            }
          }
          
          setSelectedPartyIds(new Set());
          fetchParties();
        } catch (err) {
          console.error('Bulk Monday Final Error:', err);
          alert('Failed to complete bulk settlement.');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const getBalance = async (partyId: string) => {
    const { data } = await supabase.from('transactions').select('balance').eq('party_id', partyId).order('transaction_date', { ascending: false }).limit(1);
    return data?.[0]?.balance || 0;
  };


  const handlePartySelect = (party: Party) => {
    setSelectedParty(party);
    setSelectedTnsIds(new Set());
    setSearchQuery('');
    setLinkedParty(null);
    setLinkedSearch('');
    setIsHeaderSearchOpen(false);
    setHeaderSearch('');
  };

  const togglePartySelection = (partyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedPartyIds);
    if (newSelected.has(partyId)) newSelected.delete(partyId);
    else newSelected.add(partyId);
    setSelectedPartyIds(newSelected);
  };

  const toggleTnsSelection = (tnsId: string) => {
    const newSelected = new Set(selectedTnsIds);
    if (newSelected.has(tnsId)) newSelected.delete(tnsId);
    else newSelected.add(tnsId);
    setSelectedTnsIds(newSelected);
  };

  const toggleSelectAllTns = () => {
    if (selectedTnsIds.size === transactions.length) {
      setSelectedTnsIds(new Set());
    } else {
      const newSelected = new Set<string>();
      transactions.forEach(t => newSelected.add(t.id));
      setSelectedTnsIds(newSelected);
    }
  };

  const toggleSelectAllParties = () => {
    if (selectedPartyIds.size === paginatedParties.length) {
      setSelectedPartyIds(new Set());
    } else {
      const newSelected = new Set(selectedPartyIds);
      paginatedParties.forEach(p => newSelected.add(p.id));
      setSelectedPartyIds(newSelected);
    }
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
          
          // Get all affected party IDs before deletion
          const { data: tnsToDelete } = await supabase
            .from('transactions')
            .select('party_id')
            .or(`id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')}),linked_transaction_id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')})`);
          
          const affectedPartyIds = new Set<string>([selectedParty.id, ...(tnsToDelete?.map(t => t.party_id) || [])]);

          // Delete both the anchor transactions and any transactions linked to them to prevent foreign key violations
          const { error } = await supabase
            .from('transactions')
            .delete()
            .or(`id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')}),linked_transaction_id.in.(${Array.from(allAnchorIds).map(id => `"${id}"`).join(',')})`);
            
          if (error) throw error;

          // Recalculate balances for all affected parties
          for (const pId of affectedPartyIds) {
            await recalculateBalances(pId);
          }

          setSelectedTnsIds(new Set());
          fetchParties(); // Instantly refresh party status (Yes -> No)
          if (selectedParty) fetchTransactions(selectedParty.id);
        } catch (err) { 
          console.error(err); 
          alert("Failed to delete records. " + (err as any).message);
        } finally { 
          setSubmitting(false); 
        }
      }
    });
  };

  const handleModifyTns = async () => {
    if (selectedTnsIds.size !== 1 || isOldRecordsView || !selectedParty) return;
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

  const saveModification = async () => {
    if (selectedTnsIds.size !== 1 || !selectedParty || !editFormData.linkedParty || !authUser) return;
    const tnsId = Array.from(selectedTnsIds)[0];
    const tnsA = transactions.find(t => t.id === tnsId);
    if (!tnsA) return;

    const numAmt = parseFloat(editFormData.amount);
    if (isNaN(numAmt) || numAmt === 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const anchorId = tnsA.linked_transaction_id || tnsA.id;

      // Get all affected party IDs before modification
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

      const isNewThreeWay = selectedParty.status === 'give' && editFormData.linkedParty.system_type === 'company';

      // First delete all existing transactions under this linked_transaction_id
      const { error: delError } = await supabase
        .from('transactions')
        .delete()
        .eq('linked_transaction_id', anchorId);
      
      if (delError) throw delError;

      if (isNewThreeWay) {
        // Calculate commission (1%)
        const commissionAmt = parseFloat((absAmt * 0.01).toFixed(2));
        const netAmt = parseFloat((absAmt - commissionAmt).toFixed(2));

        // Find or fetch the commission party
        const { data: commParties } = await supabase
          .from('parties')
          .select('*')
          .eq('system_type', 'commission')
          .limit(1);

        const commissionParty = commParties?.[0];
        if (!commissionParty) throw new Error("Commission account not found in database.");

        affectedPartyIds.add(commissionParty.id);

        const [balActive, balCompany, balComm] = await Promise.all([
          getBalance(selectedParty.id),
          getBalance(editFormData.linkedParty.id),
          getBalance(commissionParty.id)
        ]);

        const firstPartyCredit = primaryType === 'CR' ? netAmt : 0;
        const firstPartyDebit = primaryType === 'DR' ? netAmt : 0;
        const newBalActive = balActive + firstPartyCredit - firstPartyDebit;

        const companyCredit = secondaryType === 'CR' ? absAmt : 0;
        const companyDebit = secondaryType === 'DR' ? absAmt : 0;
        const newBalCompany = balCompany + companyCredit - companyDebit;

        const commCredit = primaryType === 'CR' ? commissionAmt : 0;
        const commDebit = primaryType === 'DR' ? commissionAmt : 0;
        const newBalComm = balComm + commCredit - commDebit;

        const { error: insertErr } = await supabase.from('transactions').insert([
          {
            id: anchorId,
            user_id: authUser.id,
            party_id: selectedParty.id,
            linked_transaction_id: anchorId,
            remarks: editFormData.remarks || '',
            tns_type: primaryType,
            credit: firstPartyCredit,
            debit: firstPartyDebit,
            balance: newBalActive
          },
          {
            id: crypto.randomUUID(),
            user_id: authUser.id,
            party_id: editFormData.linkedParty.id,
            linked_transaction_id: anchorId,
            remarks: editFormData.remarks || '',
            tns_type: secondaryType,
            credit: companyCredit,
            debit: companyDebit,
            balance: newBalCompany
          },
          {
            id: crypto.randomUUID(),
            user_id: authUser.id,
            party_id: commissionParty.id,
            linked_transaction_id: anchorId,
            remarks: `1% Commission from ${selectedParty.party_name}`,
            tns_type: primaryType,
            credit: commCredit,
            debit: commDebit,
            balance: newBalComm
          }
        ]);

        if (insertErr) throw insertErr;

      } else {
        // Normal 2-way transaction
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
            id: crypto.randomUUID(),
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
      }

      // Recalculate balances for all affected parties
      for (const pId of affectedPartyIds) {
        await recalculateBalances(pId);
      }

      setIsEditModalOpen(false);
      setSelectedTnsIds(new Set());
      await fetchTransactions(selectedParty.id);
    } catch (err) {
      console.error(err);
      alert("Error updating transaction: " + (err as any).message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParties = parties.filter(p => p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sr_no.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.ceil(filteredParties.length / ITEMS_PER_PAGE);
  const paginatedParties = filteredParties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filteredLinkedParties = parties.filter(p => p.id !== selectedParty?.id && (p.party_name.toLowerCase().includes(linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().includes(linkedSearch.toLowerCase())));
  const filteredHeaderParties = parties.filter(p => p.id !== selectedParty?.id && (p.party_name.toLowerCase().includes(headerSearch.toLowerCase()) || p.sr_no.toLowerCase().includes(headerSearch.toLowerCase())));

  // Find first case-insensitive start-matching party for inline ghost autocomplete
  const firstSearchMatch = searchQuery
    ? parties.find(p => p.party_name.toLowerCase().startsWith(searchQuery.toLowerCase()) || p.sr_no.toLowerCase().startsWith(searchQuery.toLowerCase()))
    : null;

  const firstHeaderMatch = headerSearch
    ? filteredHeaderParties.find(p => p.party_name.toLowerCase().startsWith(headerSearch.toLowerCase()) || p.sr_no.toLowerCase().startsWith(headerSearch.toLowerCase()))
    : null;

  const firstLinkedMatch = linkedSearch
    ? filteredLinkedParties.find(p => p.party_name.toLowerCase().startsWith(linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().startsWith(linkedSearch.toLowerCase()))
    : null;

  const selectLinkedParty = (party: Party) => {
    setLinkedParty(party);
    setLinkedSearch(party.party_name);
    setIsLinkedSearchOpen(false);
    if (party.system_type === 'commission' && selectedParty) {
      const isTake = selectedParty.status === 'take';
      
      // Find the last commission transaction index in the active list
      const lastCommIdx = [...transactions].reverse().findIndex(t => t.remarks?.toUpperCase() === 'COMMISSION');
      
      // Only calculate commission on transactions after the last commission transaction
      const uncommissionedTns = lastCommIdx === -1 
        ? transactions 
        : transactions.slice(transactions.length - lastCommIdx);
      
      // Filter out settlement and commission records
      const mainTns = uncommissionedTns.filter(t => !t.is_settlement && t.remarks?.toUpperCase() !== 'COMMISSION');
      const totalVolume = mainTns.reduce((sum, t) => sum + (isTake ? t.credit : t.debit), 0);
      const calculatedComm = (totalVolume * selectedParty.commission_rate) / 100;
      
      // If 'take' party, debit them (-). If 'give' party, credit them (+).
      const amountSign = isTake ? '-' : '';
      setAmount(`${amountSign}${calculatedComm.toFixed(2)}`);
      setRemarks('COMMISSION');
    }
    amountInputRef.current?.focus();
  };

  const getEditAmountColorClass = () => {
    if (!editFormData.amount) return 'text-blue-600';
    const val = parseFloat(editFormData.amount);
    if (isNaN(val) || val === 0) return 'text-blue-600';
    return val > 0 ? 'text-emerald-600' : 'text-rose-600';
  };

  const filteredEditLinkedParties = parties.filter(p => p.id !== selectedParty?.id && (p.party_name.toLowerCase().includes(editFormData.linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().includes(editFormData.linkedSearch.toLowerCase())));

  const firstEditLinkedMatch = editFormData.linkedSearch
    ? filteredEditLinkedParties.find(p => p.party_name.toLowerCase().startsWith(editFormData.linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().startsWith(editFormData.linkedSearch.toLowerCase()))
    : null;

  const selectEditLinkedParty = (party: Party) => {
    setEditFormData(prev => ({
      ...prev,
      linkedParty: party,
      linkedSearch: party.party_name
    }));
    setIsEditLinkedSearchOpen(false);
    if (party.system_type === 'commission' && selectedParty) {
      const isTake = selectedParty.status === 'take';
      const lastCommIdx = [...transactions].reverse().findIndex(t => t.remarks?.toUpperCase() === 'COMMISSION');
      const uncommissionedTns = lastCommIdx === -1 
        ? transactions 
        : transactions.slice(transactions.length - lastCommIdx);
      const mainTns = uncommissionedTns.filter(t => !t.is_settlement && t.remarks?.toUpperCase() !== 'COMMISSION');
      const totalVolume = mainTns.reduce((sum, t) => sum + (isTake ? t.credit : t.debit), 0);
      const calculatedComm = (totalVolume * selectedParty.commission_rate) / 100;
      
      const amountSign = isTake ? '-' : '';
      setEditFormData(prev => ({
        ...prev,
        amount: `${amountSign}${calculatedComm.toFixed(2)}`,
        remarks: 'COMMISSION'
      }));
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !amount || parseFloat(amount) === 0 || !linkedParty || !authUser) return;
    setSubmitting(true);
    const numAmt = parseFloat(amount);
    const absAmt = Math.abs(numAmt);
    try {
      const firstPartyType = numAmt > 0 ? 'CR' : 'DR';
      const secondPartyType = numAmt > 0 ? 'DR' : 'CR';

      const chainId = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

      const isThreeWay = selectedParty.status === 'give' && linkedParty.system_type === 'company';

      if (isThreeWay) {
        // Calculate commission (1%)
        const commissionAmt = parseFloat((absAmt * 0.01).toFixed(2));
        const netAmt = parseFloat((absAmt - commissionAmt).toFixed(2));

        // Find the commission party
        const { data: commParties } = await supabase
          .from('parties')
          .select('*')
          .eq('system_type', 'commission')
          .limit(1);

        const commissionParty = commParties?.[0];
        if (!commissionParty) throw new Error("Commission account not found in database.");

        // Get current balances
        const [balActive, balCompany, balComm] = await Promise.all([
          getBalance(selectedParty.id),
          getBalance(linkedParty.id),
          getBalance(commissionParty.id)
        ]);

        const firstPartyCredit = firstPartyType === 'CR' ? netAmt : 0;
        const firstPartyDebit = firstPartyType === 'DR' ? netAmt : 0;
        const newBalActive = balActive + firstPartyCredit - firstPartyDebit;

        const companyCredit = secondPartyType === 'CR' ? absAmt : 0;
        const companyDebit = secondPartyType === 'DR' ? absAmt : 0;
        const newBalCompany = balCompany + companyCredit - companyDebit;

        const commCredit = firstPartyType === 'CR' ? commissionAmt : 0;
        const commDebit = firstPartyType === 'DR' ? commissionAmt : 0;
        const newBalComm = balComm + commCredit - commDebit;

        const { error: insertErr } = await supabase.from('transactions').insert([
          {
            id: chainId,
            user_id: authUser.id,
            party_id: selectedParty.id,
            linked_transaction_id: chainId,
            remarks: remarks || '',
            tns_type: firstPartyType,
            credit: firstPartyCredit,
            debit: firstPartyDebit,
            balance: newBalActive
          },
          {
            id: crypto.randomUUID(),
            user_id: authUser.id,
            party_id: linkedParty.id,
            linked_transaction_id: chainId,
            remarks: remarks || '',
            tns_type: secondPartyType,
            credit: companyCredit,
            debit: companyDebit,
            balance: newBalCompany
          },
          {
            id: crypto.randomUUID(),
            user_id: authUser.id,
            party_id: commissionParty.id,
            linked_transaction_id: chainId,
            remarks: `1% Commission from ${selectedParty.party_name}`,
            tns_type: firstPartyType,
            credit: commCredit,
            debit: commDebit,
            balance: newBalComm
          }
        ]);

        if (insertErr) throw insertErr;

        // Recalculate balances to ensure everything is perfect
        await recalculateBalances(selectedParty.id);
        await recalculateBalances(linkedParty.id);
        await recalculateBalances(commissionParty.id);

      } else {
        // Get current balances
        const [balA, balB] = await Promise.all([
          getBalance(selectedParty.id),
          getBalance(linkedParty.id)
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
            remarks: remarks || '',
            tns_type: firstPartyType,
            credit: creditA,
            debit: debitA,
            balance: newBalA
          },
          {
            id: crypto.randomUUID(),
            user_id: authUser.id,
            party_id: linkedParty.id,
            linked_transaction_id: chainId,
            remarks: remarks || '',
            tns_type: secondPartyType,
            credit: creditB,
            debit: debitB,
            balance: newBalB
          }
        ]);

        if (insertErr) throw insertErr;

        // Recalculate balances to ensure everything is perfect
        await recalculateBalances(selectedParty.id);
        await recalculateBalances(linkedParty.id);
      }

      setAmount(''); setRemarks(''); setLinkedParty(null); setLinkedSearch(''); linkedSearchRef.current?.focus();
    } catch (err) { 
      console.error(err); 
      alert('Transaction creation failed: ' + ((err as any).message || 'Unknown database error'));
    } finally { 
      setSubmitting(false); 
    }
  };

  const hasSettlementSelected = Array.from(selectedTnsIds).some(id => {
    const t = transactions.find(item => item.id === id);
    return t?.is_settlement === true;
  });

  const sidebarButtons = [
    { name: 'Refresh All', icon: <RefreshCcw className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600', action: () => fetchTransactions(selectedParty?.id || '') },
    { name: 'DC Report', icon: <FileText className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600', action: () => {} },
    { name: 'Monday Final', icon: <Calendar className="w-4 h-4" />, color: 'bg-emerald-600 text-white shadow-md shadow-emerald-200', action: handleMondayFinal, disabled: isOldRecordsView },
    { 
      name: isOldRecordsView ? 'Active Ledger' : 'Old Record', 
      icon: <History className="w-4 h-4" />, 
      color: isOldRecordsView ? 'bg-orange-600 text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-600', 
      action: () => {
        const nextState = !isOldRecordsView;
        setIsOldRecordsView(nextState);
        fetchTransactions(selectedParty!.id, nextState);
      } 
    },
    { 
      name: 'Modify', 
      icon: <Edit2 className="w-4 h-4" />, 
      color: (isOldRecordsView || hasSettlementSelected) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-md shadow-blue-200', 
      action: handleModifyTns, 
      disabled: selectedTnsIds.size !== 1 || isOldRecordsView || hasSettlementSelected
    },
    { 
      name: 'Delete', 
      icon: <Trash2 className="w-4 h-4" />, 
      color: (isOldRecordsView || hasSettlementSelected) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-600 text-white shadow-md shadow-rose-200', 
      action: handleDeleteTns, 
      disabled: selectedTnsIds.size === 0 || isOldRecordsView || hasSettlementSelected
    },
    { name: 'Print', icon: <Printer className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600', action: () => window.print() },
    { name: 'Check All', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600', action: () => toggleSelectAllTns() },
    { name: 'Exit', icon: <XCircle className="w-4 h-4" />, color: 'bg-orange-500 text-white shadow-md shadow-orange-200', action: () => setSelectedParty(null) },
  ];

  if (loading) return <GlobalLoader fullScreen={true} />;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {!selectedParty ? (
        <div className="max-w-6xl mx-auto w-full px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none"><Database className="w-6 h-6" /></div>
              <div><h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Party A/C Ledger</h1><p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Select a party to begin.</p></div>
            </div>
            <div className="flex gap-2 w-full md:w-auto items-center">
              <div className="relative flex-grow md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
                {firstSearchMatch && (
                  <div className="absolute inset-0 pl-10 pr-4 py-3 pointer-events-none flex items-center font-bold text-base select-none z-0">
                    <span className="text-transparent">{searchQuery}</span>
                    <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg px-2 py-0.5 text-xs font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                      {firstSearchMatch.party_name.slice(searchQuery.length)}
                      <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-1 text-[9px] text-blue-500 font-black shadow-xs">TAB</kbd>
                    </span>
                  </div>
                )}
                <input 
                  ref={searchInputRef} 
                  autoFocus 
                  placeholder="Search Party..." 
                  className="w-full pl-10 pr-4 py-3 bg-transparent outline-none font-bold text-base text-slate-800 dark:text-white relative z-10" 
                  value={searchQuery} 
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === 'Tab') && firstSearchMatch) {
                      e.preventDefault();
                      handlePartySelect(firstSearchMatch);
                    }
                  }}
                />
              </div>
              <button 
                onClick={handleBulkMondayFinal}
                disabled={submitting || selectedPartyIds.size === 0}
                className={`px-5 py-3 font-black rounded-xl transition-all flex items-center gap-2 shadow-sm shrink-0 uppercase text-[10px] tracking-widest border transition-all ${
                  selectedPartyIds.size > 0 
                    ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 dark:border-emerald-600' 
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {submitting ? 'Settling...' : `Monday Final ${selectedPartyIds.size > 0 ? `(${selectedPartyIds.size})` : ''}`}
              </button>
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 dark:shadow-none rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all whitespace-nowrap shrink-0 border border-rose-700"
              >
                <XCircle className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
            <div className="overflow-x-auto overflow-y-auto max-h-[550px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/30 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                  <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="px-8 py-4">Party Name</th>
                    <th className="px-8 py-4 text-center">Monday Final</th>
                    <th className="px-8 py-4 text-center">
                       <div onClick={toggleSelectAllParties} className={`w-5 h-5 rounded border-2 mx-auto cursor-pointer transition-all flex items-center justify-center ${selectedPartyIds.size === paginatedParties.length && paginatedParties.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>{selectedPartyIds.size === paginatedParties.length && paginatedParties.length > 0 && <div className="w-2 h-2 bg-white rounded-sm"></div>}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-sm font-medium">
                  {paginatedParties.map((party) => (
                    <tr key={party.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-all group" onClick={() => handlePartySelect(party)}>
                      <td className="px-8 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 w-8">{party.sr_no}</span>
                          <span className="font-bold text-base text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{party.party_name}</span>
                          {party.system_type !== 'normal' && <span className="text-[8px] bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase font-black">System</span>}
                        </div>
                      </td>
                      <td className="px-8 py-3.5"><div className={`mx-auto w-24 py-1 rounded-lg text-[9px] font-black uppercase text-center flex items-center justify-center gap-1.5 ${((party.monday_final as any) === true || (party.monday_final as any) === 'true') ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450' : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-450'}`}>{ ((party.monday_final as any) === true || (party.monday_final as any) === 'true') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{((party.monday_final as any) === true || (party.monday_final as any) === 'true') ? 'Yes' : 'No'}</div></td>
                      <td className="px-8 py-3.5 text-center"><div onClick={(e) => togglePartySelection(party.id, e)} className={`w-6 h-6 rounded-lg border-2 mx-auto transition-all flex items-center justify-center ${selectedPartyIds.has(party.id) ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-400'}`}><div className={`w-2 h-2 bg-white rounded-sm transition-opacity ${selectedPartyIds.has(party.id) ? 'opacity-100' : 'opacity-0'}`}></div></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-1.5 text-slate-600 dark:text-slate-400">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-20 transition-colors duration-200">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedParty(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-all"><ArrowLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-4" ref={headerDropdownRef}>
                <div className="relative w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
                  {firstHeaderMatch && (
                    <div className="absolute inset-0 pl-10 pr-8 py-2 pointer-events-none flex items-center font-bold text-slate-800 dark:text-slate-300 text-sm select-none z-0">
                      <span className="text-transparent">{headerSearch}</span>
                      <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded px-1.5 py-0.5 text-[9px] font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                        {firstHeaderMatch.party_name.slice(headerSearch.length)}
                        <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-1 text-[8px] text-blue-500 font-black shadow-xs">TAB</kbd>
                      </span>
                    </div>
                  )}
                  <input 
                    ref={headerSearchRef} 
                    placeholder={selectedParty.party_name} 
                    className="w-full pl-10 pr-8 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800 dark:text-white relative z-10" 
                    value={headerSearch} 
                    onChange={(e) => { setHeaderSearch(e.target.value); setIsHeaderSearchOpen(true); setHighlightedIndex(0); }} 
                    onClick={() => setIsHeaderSearchOpen(true)} 
                    onKeyDown={(e) => { 
                      if ((e.key === 'Enter' || e.key === 'Tab') && firstHeaderMatch) {
                        e.preventDefault();
                        handlePartySelect(firstHeaderMatch);
                      } else if (e.key === 'ArrowDown') {
                        setIsHeaderSearchOpen(true);
                        setHighlightedIndex(p => Math.min(p+1, filteredHeaderParties.length-1)); 
                      } else if (e.key === 'ArrowUp') {
                        setHighlightedIndex(p => Math.max(p-1, 0)); 
                      } else if (e.key === 'Enter' && filteredHeaderParties.length > 0) {
                        e.preventDefault();
                        handlePartySelect(filteredHeaderParties[highlightedIndex]);
                      }
                    }} 
                  />
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 z-10 transition-all pointer-events-none ${isHeaderSearchOpen ? 'rotate-180' : ''}`} />
                  {isHeaderSearchOpen && filteredHeaderParties.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                      {filteredHeaderParties.map((p, i) => (
                        <div 
                          key={p.id} 
                          onClick={() => handlePartySelect(p)} 
                          className={`px-4 py-2.5 cursor-pointer flex justify-between items-center ${i === highlightedIndex ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                        >
                          <span className="font-bold text-sm">{p.party_name}</span>
                          <span className="text-[10px] font-black opacity-45 dark:opacity-60 uppercase">{p.sr_no}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">SR NO: {selectedParty.sr_no}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${selectedParty.status === 'take' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450'}`}>
                      {selectedParty.status} {selectedParty.system_type === 'normal' && `(${selectedParty.commission_rate}%)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right"><p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Closing Balance</p><p className={`text-3xl font-black ${closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-450'}`}>₹ {Math.abs(closingBalance).toLocaleString()}<span className="text-sm ml-1 uppercase font-bold">{closingBalance >= 0 ? 'Cr' : 'Dr'}</span></p></div>
          </div>
          <div className="flex flex-grow overflow-hidden">
            <div className="flex-grow flex flex-col overflow-hidden relative">
              <div className="flex-grow overflow-y-auto px-6 py-4 bg-slate-50/30 dark:bg-slate-950/10">
                <div className="bg-white dark:bg-slate-900 rounded-[1.2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                      <tr>
                        <th className="px-6 py-3 text-center"><div onClick={toggleSelectAllTns} className={`w-4 h-4 rounded border-2 mx-auto cursor-pointer transition-all flex items-center justify-center ${selectedTnsIds.size === transactions.length && transactions.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>{selectedTnsIds.size === transactions.length && transactions.length > 0 && <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>}</div></th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Particulars / Remarks</th>
                        <th className="px-6 py-3 text-right">Credit</th>
                        <th className="px-6 py-3 text-right">Debit</th>
                        <th className="px-6 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 font-medium text-sm">
                      {transactions.map((t) => (
                        <tr key={t.id} onClick={() => toggleTnsSelection(t.id)} className={`cursor-pointer transition-all ${selectedTnsIds.has(t.id) ? 'bg-blue-600 dark:bg-blue-900 text-white shadow-lg' : t.is_settlement ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-950/20'}`}>
                          <td className="px-6 py-3 text-center"><div className={`w-5 h-5 rounded-lg border-2 mx-auto transition-all flex items-center justify-center ${selectedTnsIds.has(t.id) ? 'bg-white border-white shadow-md shadow-blue-800 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'}`}><div className={`w-2 h-2 bg-blue-600 rounded-sm transition-opacity ${selectedTnsIds.has(t.id) ? 'opacity-100' : 'opacity-0'}`}></div></div></td>
                          <td className={`px-6 py-3 text-[10px] ${selectedTnsIds.has(t.id) ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>{new Date(t.transaction_date).toLocaleDateString()}</td>
                          <td className="px-6 py-3 font-bold">
                            {!t.is_settlement && (
                              <span className={`uppercase text-[11px] font-black ${selectedTnsIds.has(t.id) ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                {t.partner_party_name || '-'}
                              </span>
                            )}
                            {t.remarks && (
                              <span className={`ml-2 text-xs font-medium italic ${selectedTnsIds.has(t.id) ? 'text-blue-100' : t.is_settlement ? 'text-blue-700 dark:text-blue-450 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                                ({t.remarks})
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-3 text-right ${selectedTnsIds.has(t.id) ? 'text-white' : 'text-emerald-600 dark:text-emerald-450 font-bold'}`}>{t.credit > 0 ? `₹ ${t.credit.toLocaleString()}` : '-'}</td>
                          <td className={`px-6 py-3 text-right ${selectedTnsIds.has(t.id) ? 'text-white' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>{t.debit > 0 ? `₹ ${t.debit.toLocaleString()}` : '-'}</td>
                          <td className={`px-6 py-3 text-right font-black ${selectedTnsIds.has(t.id) ? 'text-white' : (t.balance >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-400')}`}>₹ {Math.abs(t.balance).toLocaleString()} {t.balance >= 0 ? 'Cr' : 'Dr'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 shadow-xl dark:shadow-none shrink-0 transition-colors duration-200">
                <form onSubmit={handleSubmitEntry} className={`max-w-6xl mx-auto flex gap-4 items-end ${isOldRecordsView ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 col-span-1 relative" ref={dropdownRef}><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Transfer To</label>
                      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
                        <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
                        {firstLinkedMatch && (
                          <div className="absolute inset-0 pl-11 pr-8 py-3 pointer-events-none flex items-center font-bold text-slate-800 dark:text-slate-300 select-none z-0">
                            <span className="text-transparent">{linkedSearch}</span>
                            <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg px-2 py-0.5 text-xs font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                              {firstLinkedMatch.party_name.slice(linkedSearch.length)}
                              <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-1 text-[9px] text-blue-500 font-black shadow-xs">TAB</kbd>
                            </span>
                          </div>
                        )}
                        <input 
                          ref={linkedSearchRef} 
                          placeholder="Search Party..." 
                          className="w-full pl-11 pr-8 py-3 bg-transparent outline-none font-bold text-slate-800 dark:text-white relative z-10" 
                          value={linkedSearch} 
                          onChange={(e) => { setLinkedSearch(e.target.value); setIsLinkedSearchOpen(true); setHighlightedIndex(0); }} 
                          onClick={() => setIsLinkedSearchOpen(true)} 
                          onKeyDown={(e) => { 
                            if ((e.key === 'Enter' || e.key === 'Tab') && firstLinkedMatch) {
                              e.preventDefault();
                              selectLinkedParty(firstLinkedMatch);
                            } else if(e.key === 'ArrowDown') { 
                              setIsLinkedSearchOpen(true); 
                              setHighlightedIndex(p => Math.min(p+1, filteredLinkedParties.length-1)); 
                            } else if(e.key === 'ArrowUp') {
                              setHighlightedIndex(p => Math.max(p-1, 0)); 
                            } else if(e.key === 'Enter' && filteredLinkedParties.length > 0) { 
                              e.preventDefault(); 
                              selectLinkedParty(filteredLinkedParties[highlightedIndex]); 
                            } 
                          }} 
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 z-10 pointer-events-none" />
                        {isLinkedSearchOpen && filteredLinkedParties.length > 0 && (
                          <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl dark:shadow-none max-h-60 overflow-y-auto z-50">
                            {filteredLinkedParties.map((p, i) => (
                              <div 
                                key={p.id} 
                                onClick={() => selectLinkedParty(p)} 
                                className={`px-5 py-3 cursor-pointer flex justify-between items-center ${i === highlightedIndex ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                              >
                                <span className="font-bold">{p.party_name}</span>
                                <span className="text-[10px] font-black opacity-40 dark:opacity-60 uppercase">{p.sr_no}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 col-span-1"><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Amount (₹)</label><input ref={amountInputRef} required type="number" step="0.01" placeholder="3000 (CR) or -3000 (DR)" className={`w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-black text-xl transition-colors ${getAmountColorClass()}`} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                    <div className="space-y-1.5 col-span-2"><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Narration / Remarks</label><div className="relative"><Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input placeholder="Enter details..." className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none font-medium text-slate-800 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div></div>
                  </div>
                  <button type="submit" disabled={submitting || !amount || parseFloat(amount) === 0 || !linkedParty || isOldRecordsView} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-base flex items-center gap-3 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 h-[52px]">{submitting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Save Entry'}</button>
                </form>
              </div>
            </div>
            <div className="w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 space-y-2 flex flex-col shrink-0 shadow-sm transition-colors duration-200">
              {sidebarButtons.map((btn) => (
                <button 
                  key={btn.name} 
                  onClick={btn.action} 
                  disabled={btn.disabled} 
                  className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 ${
                    btn.color.includes('bg-slate-100') ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' : btn.color
                  } ${btn.disabled ? 'opacity-30 cursor-not-allowed scale-100' : ''}`}
                >
                  {btn.icon}
                  {btn.name}
                </button>
              ))}
              <div className="flex-grow"></div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status</p>
                <div className="text-sm font-black text-slate-900 dark:text-white">{selectedTnsIds.size > 0 ? `${selectedTnsIds.size} Selected` : 'None'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Modify Entry</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5 relative" ref={editDropdownRef}>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Transfer To</label>
                <div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
                  <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-455 z-10" />
                  {firstEditLinkedMatch && (
                    <div className="absolute inset-0 pl-11 pr-8 py-3 pointer-events-none flex items-center font-bold text-slate-800 dark:text-slate-300 select-none z-0">
                      <span className="text-transparent">{editFormData.linkedSearch}</span>
                      <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg px-2 py-0.5 text-xs font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                        {firstEditLinkedMatch.party_name.slice(editFormData.linkedSearch.length)}
                        <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-1 text-[9px] text-blue-500 font-black shadow-xs">TAB</kbd>
                      </span>
                    </div>
                  )}
                  <input 
                    ref={editLinkedSearchRef} 
                    placeholder="Search Party..." 
                    className="w-full pl-11 pr-8 py-3 bg-transparent outline-none font-bold text-slate-800 dark:text-white relative z-10" 
                    value={editFormData.linkedSearch} 
                    onChange={(e) => { 
                      setEditFormData({ ...editFormData, linkedSearch: e.target.value }); 
                      setIsEditLinkedSearchOpen(true); 
                      setEditHighlightedIndex(0); 
                    }} 
                    onClick={() => setIsEditLinkedSearchOpen(true)} 
                    onKeyDown={(e) => { 
                      if ((e.key === 'Enter' || e.key === 'Tab') && firstEditLinkedMatch) {
                        e.preventDefault();
                        selectEditLinkedParty(firstEditLinkedMatch);
                      } else if(e.key === 'ArrowDown') { 
                        setIsEditLinkedSearchOpen(true); 
                        setEditHighlightedIndex(p => Math.min(p+1, filteredEditLinkedParties.length-1)); 
                      } else if(e.key === 'ArrowUp') {
                        setEditHighlightedIndex(p => Math.max(p-1, 0)); 
                      } else if(e.key === 'Enter' && filteredEditLinkedParties.length > 0) { 
                        e.preventDefault(); 
                        selectEditLinkedParty(filteredEditLinkedParties[editHighlightedIndex]); 
                      } 
                    }} 
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-650 z-10 pointer-events-none" />
                  {isEditLinkedSearchOpen && filteredEditLinkedParties.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-50">
                      {filteredEditLinkedParties.map((p, i) => (
                        <div 
                          key={p.id} 
                          onClick={() => selectEditLinkedParty(p)} 
                          className={`px-5 py-3 cursor-pointer flex justify-between items-center ${i === editHighlightedIndex ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                        >
                          <span className="font-bold">{p.party_name}</span>
                          <span className="text-[10px] font-black opacity-40 dark:opacity-60 uppercase">{p.sr_no}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Amount (₹)</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  placeholder="3000 (CR) or -3000 (DR)" 
                  className={`w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-black text-xl transition-colors ${getEditAmountColorClass()}`} 
                  value={editFormData.amount} 
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Narration / Remarks</label>
                <div className="relative">
                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input 
                    placeholder="Enter details..." 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-medium text-slate-800 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600" 
                    value={editFormData.remarks} 
                    onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })} 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-grow py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
                <button onClick={saveModification} disabled={submitting || !editFormData.amount || parseFloat(editFormData.amount) === 0 || !editFormData.linkedParty} className="flex-grow py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-5 h-5" />Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 ${
              confirmDialog.type === 'danger' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450' : 
              confirmDialog.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450' : 
              'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
            }`}>
              {confirmDialog.type === 'danger' ? <Trash2 className="w-10 h-10" /> : 
               confirmDialog.type === 'success' ? <CheckCircle2 className="w-10 h-10" /> : 
               <Edit2 className="w-10 h-10" />}
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">{confirmDialog.message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDialog.onConfirm}
                className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${
                  confirmDialog.type === 'danger' ? 'bg-rose-600 shadow-rose-200 dark:shadow-none hover:bg-rose-700' : 
                  confirmDialog.type === 'success' ? 'bg-emerald-600 shadow-emerald-200 dark:shadow-none hover:bg-emerald-700' : 
                  'bg-blue-600 shadow-blue-200 dark:shadow-none hover:bg-blue-700'
                }`}
              >
                Confirm Action
              </button>
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LedgerView;
