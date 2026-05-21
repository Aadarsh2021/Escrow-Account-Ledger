import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GlobalLoader } from '../components/ui/GlobalLoader';

// Component Imports
import { EditTransactionModal } from '../components/ledger/EditTransactionModal';
import { ConfirmDialog } from '../components/ledger/ConfirmDialog';
import { DcReportModal } from '../components/ledger/DcReportModal';
import { LedgerPrintLayout } from '../components/ledger/LedgerPrintLayout';

// Hook and Type Imports
import { useLedgerTransactions, type Party } from '../hooks/useLedgerTransactions';

const ITEMS_PER_PAGE = 20;

const LedgerView = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  
  // Parties state and caching logic
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
  
  // Local active ledger navigation states
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOldRecordsView, setIsOldRecordsView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Entry Form inputs
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [linkedParty, setLinkedParty] = useState<Party | null>(null);
  const [linkedSearch, setLinkedSearch] = useState('');
  
  // Autocomplete search states
  const [isLinkedSearchOpen, setIsLinkedSearchOpen] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Focus and layout refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const linkedSearchRef = useRef<HTMLInputElement>(null);
  const remarksInputRef = useRef<HTMLInputElement>(null);
  const headerSearchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerDropdownRef = useRef<HTMLDivElement>(null);

  // confirmation dialog state passing
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'success';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  // DB Sync logic
  const fetchParties = async () => {
    try {
      const { data, error } = await supabase.from('parties').select('*').order('party_name', { ascending: true });
      if (error) throw error;
      const cleanData = (data || []) as Party[];
      setParties(cleanData);
      try {
        localStorage.setItem('cached_parties', JSON.stringify(cleanData));
      } catch (e) {
        console.error('Error caching parties in Ledger:', e);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Custom ledger transaction operation hook
  const {
    transactions,
    printTransactions,
    closingBalance,
    selectedTnsIds,
    setSelectedTnsIds,
    selectedPartyIds,
    setSelectedPartyIds,
    submitting,
    isDcModalOpen,
    setIsDcModalOpen,
    dcFromDate,
    setDcFromDate,
    dcToDate,
    setDcToDate,
    isDcLoading,
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
    handleMondayFinal,
    handleBulkMondayFinal,
    handleDeleteTns,
    saveModification,
    handleModifyTns,
    selectEditLinkedParty,
    calculateCommission,
    createTransactionEntry
  } = useLedgerTransactions({
    selectedParty,
    authUser,
    parties,
    fetchParties,
    isOldRecordsView,
    setConfirmDialog
  });

  // Load parties list and click outside listeners on mount
  useEffect(() => {
    fetchParties();
    
    const partiesChannel = supabase.channel('ledger-parties-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, () => {
        fetchParties();
      })
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLinkedSearchOpen(false);
      }
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target as Node)) {
        setIsHeaderSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      supabase.removeChannel(partiesChannel);
    };
  }, []);

  // Sync selectedParty with URL and fetch transactions
  useEffect(() => {
    if (selectedParty && parties.length > 0) {
      const updatedParty = parties.find(p => p.id === selectedParty.id);
      if (updatedParty && JSON.stringify(updatedParty) !== JSON.stringify(selectedParty)) {
        setSelectedParty(updatedParty);
      }
    }
  }, [parties, selectedParty, setSelectedParty]);

  useEffect(() => {
    const urlPartyId = searchParams.get('partyId');
    if (urlPartyId) {
      if (parties.length > 0) {
        const foundParty = parties.find(p => p.id === urlPartyId);
        if (foundParty) {
          if (!selectedParty || selectedParty.id !== foundParty.id) {
            setTimeout(() => {
              handlePartySelect(foundParty);
            }, 0);
          }
        } else {
          setSearchParams({});
        }
      }
    } else {
      if (selectedParty) {
        setSelectedParty(null);
        setSelectedTnsIds(new Set());
        setSearchQuery('');
        setLinkedParty(null);
        setLinkedSearch('');
        setAmount('');
        setRemarks('');
        setIsHeaderSearchOpen(false);
        setHeaderSearch('');
        setIsOldRecordsView(false);
      }
    }
  }, [searchParams, parties]);

  useEffect(() => {
    if (selectedParty) {
      fetchTransactions(selectedParty.id);
      fetchAllTransactionsForPrint(selectedParty.id);
      
      setTimeout(() => {
        linkedSearchRef.current?.focus();
      }, 50);

      const channel = supabase.channel(`ledger-${selectedParty.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `party_id=eq.${selectedParty.id}` }, () => {
          fetchTransactions(selectedParty.id);
          fetchAllTransactionsForPrint(selectedParty.id);
        })
        .subscribe();
      
      return () => { 
        supabase.removeChannel(channel); 
      };
    }
  }, [selectedParty]);

  const handlePartySelect = (party: Party) => {
    setSearchParams({ partyId: party.id });
    setSelectedParty(party);
    setSelectedTnsIds(new Set());
    setSearchQuery('');
    setLinkedParty(null);
    setLinkedSearch('');
    setAmount('');
    setRemarks('');
    setIsHeaderSearchOpen(false);
    setHeaderSearch('');
    setIsOldRecordsView(false);
  };

  const handleExitParty = () => {
    setSearchParams({});
    setSelectedParty(null);
    setSelectedTnsIds(new Set());
    setSearchQuery('');
    setLinkedParty(null);
    setLinkedSearch('');
    setAmount('');
    setRemarks('');
    setIsHeaderSearchOpen(false);
    setHeaderSearch('');
    setIsOldRecordsView(false);
  };

  const togglePartySelection = (partyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedPartyIds);
    if (newSelected.has(partyId)) {
      newSelected.delete(partyId);
    } else {
      newSelected.add(partyId);
    }
    setSelectedPartyIds(newSelected);
  };

  const toggleTnsSelection = (tnsId: string) => {
    const newSelected = new Set(selectedTnsIds);
    if (newSelected.has(tnsId)) {
      newSelected.delete(tnsId);
    } else {
      newSelected.add(tnsId);
    }
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

  const handleSelectLinkedParty = async (party: Party) => {
    setLinkedParty(party);
    setLinkedSearch(party.party_name);
    setIsLinkedSearchOpen(false);
    
    if (party.system_type === 'commission' && selectedParty) {
      const result = await calculateCommission();
      setAmount(result.amount);
      setRemarks(result.remarks);
    }
    amountInputRef.current?.focus();
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !amount || parseFloat(amount) === 0 || !linkedParty) return;
    
    const success = await createTransactionEntry(amount, remarks, linkedParty);
    if (success) {
      setAmount('');
      setRemarks('');
      setLinkedParty(null);
      setLinkedSearch('');
      linkedSearchRef.current?.focus();
    }
  };

  // Searching and Pagination Computations
  const filteredParties = parties.filter(p => 
    p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sr_no.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredParties.length / ITEMS_PER_PAGE);
  const paginatedParties = filteredParties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const isSearchActive = linkedSearch.trim() !== '' && (!linkedParty || linkedSearch !== linkedParty.party_name);

  const filteredLinkedParties = parties.filter(p => 
    p.id !== selectedParty?.id && 
    (!isSearchActive || p.party_name.toLowerCase().includes(linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().includes(linkedSearch.toLowerCase()))
  );
  
  const filteredHeaderParties = parties.filter(p => 
    p.id !== selectedParty?.id && 
    (p.party_name.toLowerCase().includes(headerSearch.toLowerCase()) || p.sr_no.toLowerCase().includes(headerSearch.toLowerCase()))
  );

  const firstSearchMatch = searchQuery
    ? parties.find(p => p.party_name.toLowerCase().startsWith(searchQuery.toLowerCase()) || p.sr_no.toLowerCase().startsWith(searchQuery.toLowerCase()))
    : null;

  const firstHeaderMatch = headerSearch
    ? filteredHeaderParties.find(p => p.party_name.toLowerCase().startsWith(headerSearch.toLowerCase()) || p.sr_no.toLowerCase().startsWith(headerSearch.toLowerCase()))
    : null;

  const firstLinkedMatch = isSearchActive
    ? filteredLinkedParties.find(p => p.party_name.toLowerCase().startsWith(linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().startsWith(linkedSearch.toLowerCase()))
    : null;

  const isEditSearchActive = editFormData.linkedSearch.trim() !== '' && (!editFormData.linkedParty || editFormData.linkedSearch !== editFormData.linkedParty.party_name);

  const filteredEditLinkedParties = parties.filter(p => 
    p.id !== selectedParty?.id && 
    (!isEditSearchActive || p.party_name.toLowerCase().includes(editFormData.linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().includes(editFormData.linkedSearch.toLowerCase()))
  );

  const firstEditLinkedMatch = isEditSearchActive
     ? filteredEditLinkedParties.find(p => p.party_name.toLowerCase().startsWith(editFormData.linkedSearch.toLowerCase()) || p.sr_no.toLowerCase().startsWith(editFormData.linkedSearch.toLowerCase()))
     : null;

  const getAmountColorClass = () => {
    if (!amount) return 'text-blue-600';
    const val = parseFloat(amount);
    if (isNaN(val) || val === 0) return 'text-blue-600';
    return val > 0 ? 'text-emerald-600' : 'text-rose-600';
  };

  const hasSettlementSelected = Array.from(selectedTnsIds).some(id => {
    const t = transactions.find(item => item.id === id);
    return t?.is_settlement === true;
  });

  const sidebarButtons = [
    { 
      name: 'Refresh All', 
      icon: <RefreshCcw className="w-4 h-4" />, 
      color: 'bg-slate-100 text-slate-600', 
      action: () => { 
        if (selectedParty) { 
          fetchTransactions(selectedParty.id, isOldRecordsView); 
          fetchAllTransactionsForPrint(selectedParty.id); 
        } 
      } 
    },
    { 
      name: 'DC Report', 
      icon: <FileText className="w-4 h-4" />, 
      color: 'bg-slate-100 text-slate-600', 
      action: () => setIsDcModalOpen(true) 
    },
    { 
      name: 'Monday Final', 
      icon: <Calendar className="w-4 h-4" />, 
      color: 'bg-emerald-600 text-white shadow-md shadow-emerald-200', 
      action: handleMondayFinal, 
      disabled: isOldRecordsView 
    },
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
    { 
      name: 'Print', 
      icon: <Printer className="w-4 h-4" />, 
      color: 'bg-slate-100 text-slate-600', 
      action: () => window.print() 
    },
    { 
      name: 'Check All', 
      icon: <CheckSquare className="w-4 h-4" />, 
      color: 'bg-slate-100 text-slate-600', 
      action: () => toggleSelectAllTns() 
    },
    { 
      name: 'Exit', 
      icon: <XCircle className="w-4 h-4" />, 
      color: 'bg-orange-500 text-white shadow-md shadow-orange-200', 
      action: handleExitParty 
    },
  ];

  if (loading) return <GlobalLoader fullScreen={true} />;

  // Computations for full print records
  const printTotalCredit = printTransactions.filter(t => !t.is_settlement).reduce((sum, t) => sum + Number(t.credit || 0), 0);
  const printTotalDebit = printTransactions.filter(t => !t.is_settlement).reduce((sum, t) => sum + Number(t.debit || 0), 0);
  const printFinalBalance = printTransactions.length > 0 ? printTransactions[printTransactions.length - 1].balance : 0;

  return (
    <>
      <div className="flex flex-col h-auto lg:h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 transition-colors duration-200 print:hidden">
      {!selectedParty ? (
        <div className="max-w-6xl mx-auto w-full px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Party A/C Ledger</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Select a party to begin.</p>
              </div>
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
                      <td className="px-8 py-3.5"><div className={`mx-auto w-24 py-1 rounded-lg text-[9px] font-black uppercase text-center flex items-center justify-center gap-1.5 ${((party.monday_final as any) === true || (party.monday_final as any) === 'true') ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-455' : 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-455'}`}>{ ((party.monday_final as any) === true || (party.monday_final as any) === 'true') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{((party.monday_final as any) === true || (party.monday_final as any) === 'true') ? 'Yes' : 'No'}</div></td>
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
        <div className="flex flex-col h-auto lg:h-full lg:overflow-hidden">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex flex-col md:flex-row gap-4 md:items-center justify-between shrink-0 shadow-sm z-20 transition-colors duration-200">
            <div className="flex items-start md:items-center gap-3 md:gap-4">
              <button onClick={handleExitParty} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-all shrink-0">
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <div className="flex flex-wrap items-center gap-2 md:gap-4" ref={headerDropdownRef}>
                <div className="relative w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
                  {firstHeaderMatch && (
                    <div className="absolute inset-0 pl-10 pr-8 py-2 pointer-events-none flex items-center font-bold text-slate-800 dark:text-slate-300 text-sm select-none z-0">
                      <span className="text-transparent">{firstHeaderMatch.party_name.slice(0, headerSearch.length)}</span>
                      <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-450 border border-blue-100 dark:border-blue-900/30 rounded px-1.5 py-0.5 text-[9px] font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
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
                      const isHeaderSearchActive = headerSearch.trim() !== '';
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsHeaderSearchOpen(false);
                      } else if ((e.key === 'Enter' || e.key === 'Tab') && isHeaderSearchActive && firstHeaderMatch) {
                        e.preventDefault();
                        handlePartySelect(firstHeaderMatch);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setIsHeaderSearchOpen(true);
                        setHighlightedIndex(p => Math.min(p+1, filteredHeaderParties.length-1)); 
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex(p => Math.max(p-1, 0)); 
                      } else if (e.key === 'Enter' && isHeaderSearchActive && filteredHeaderParties.length > 0) {
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
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 font-bold text-sm text-slate-800 dark:text-slate-200 shadow-sm transition-colors">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">SR NO:</span>
                  <span className="leading-none">{selectedParty.sr_no}</span>
                </div>
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-1.5 font-black text-sm shadow-sm transition-colors">
                  <span className={`uppercase leading-none ${selectedParty.status === 'take' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-455'}`}>
                    {selectedParty.status}
                  </span>
                  {selectedParty.system_type === 'normal' && (
                    <span className="text-slate-400 dark:text-slate-500 font-bold leading-none">
                      ({selectedParty.commission_rate}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-left md:text-right px-10 md:px-0">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Closing Balance</p>
              <p className={`text-2xl md:text-3xl font-black ${closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-rose-600 dark:text-rose-455'}`}>
                ₹ {Math.abs(closingBalance).toLocaleString()}<span className="text-sm ml-1 uppercase font-bold">{closingBalance >= 0 ? 'Cr' : 'Dr'}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row flex-grow lg:overflow-hidden h-auto lg:h-full">
            <div className="flex-grow flex flex-col h-auto lg:h-full lg:overflow-hidden relative">
              <div className="flex-grow overflow-y-auto px-4 md:px-6 py-4 bg-slate-50/30 dark:bg-slate-950/10">
                <div className="bg-white dark:bg-slate-900 rounded-[1.2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto transition-colors duration-200">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 font-bold text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                      <tr>
                        <th className="px-6 py-3 text-center">
                          <div onClick={toggleSelectAllTns} className={`w-4 h-4 rounded border-2 mx-auto cursor-pointer transition-all flex items-center justify-center ${selectedTnsIds.size === transactions.length && transactions.length > 0 ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>
                            {selectedTnsIds.size === transactions.length && transactions.length > 0 && <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>}
                          </div>
                        </th>
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
                          <td className="px-6 py-3 text-center">
                            <div className={`w-5 h-5 rounded-lg border-2 mx-auto transition-all flex items-center justify-center ${selectedTnsIds.has(t.id) ? 'bg-white border-white shadow-md shadow-blue-800 dark:shadow-none' : 'border-slate-200 dark:border-slate-700'}`}>
                              <div className={`w-2 h-2 bg-blue-600 rounded-sm transition-opacity ${selectedTnsIds.has(t.id) ? 'opacity-100' : 'opacity-0'}`}></div>
                            </div>
                          </td>
                          <td className={`px-6 py-3 text-[10px] ${selectedTnsIds.has(t.id) ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>{new Date(t.transaction_date).toLocaleDateString()}</td>
                          <td className="px-6 py-3 font-bold">
                            {!t.is_settlement && (
                              <span className={`uppercase text-[11px] font-black ${selectedTnsIds.has(t.id) ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                {t.partner_party_name || '-'}
                              </span>
                            )}
                            {t.remarks && (
                              <span className={`ml-2 text-xs font-medium italic ${selectedTnsIds.has(t.id) ? 'text-blue-100' : t.is_settlement ? 'text-blue-700 dark:text-blue-455 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                                ({t.remarks})
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-3 text-right ${selectedTnsIds.has(t.id) ? 'text-white' : 'text-emerald-600 dark:text-emerald-455 font-bold'}`}>{t.credit > 0 ? `₹ ${t.credit.toLocaleString()}` : '-'}</td>
                          <td className={`px-6 py-3 text-right ${selectedTnsIds.has(t.id) ? 'text-white' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>{t.debit > 0 ? `₹ ${t.debit.toLocaleString()}` : '-'}</td>
                          <td className={`px-6 py-3 text-right font-black ${selectedTnsIds.has(t.id) ? 'text-white' : (t.balance >= 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-rose-600 dark:text-rose-400')}`}>₹ {Math.abs(t.balance).toLocaleString()} {t.balance >= 0 ? 'Cr' : 'Dr'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 shadow-xl dark:shadow-none shrink-0 transition-colors duration-200">
                <form onSubmit={handleSubmitEntry} className={`max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-stretch md:items-end ${isOldRecordsView ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 col-span-1 relative" ref={dropdownRef}>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Transfer To</label>
                      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
                        <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
                        {firstLinkedMatch && (
                          <div className="absolute inset-0 pl-11 pr-8 py-3 pointer-events-none flex items-center font-bold text-slate-800 dark:text-slate-300 select-none z-0">
                            <span className="text-transparent">{firstLinkedMatch.party_name.slice(0, linkedSearch.length)}</span>
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
                          onChange={(e) => { 
                            const val = e.target.value;
                            setLinkedSearch(val); 
                            setIsLinkedSearchOpen(true); 
                            setHighlightedIndex(0); 
                            if (linkedParty && val !== linkedParty.party_name) {
                              setLinkedParty(null);
                            }
                          }} 
                          onClick={() => setIsLinkedSearchOpen(true)} 
                          onKeyDown={(e) => { 
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setIsLinkedSearchOpen(false);
                            } else if (e.key === 'ArrowDown') { 
                              e.preventDefault();
                              setIsLinkedSearchOpen(true); 
                              setHighlightedIndex(p => Math.min(p+1, filteredLinkedParties.length-1)); 
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedIndex(p => Math.max(p-1, 0)); 
                            } else if (e.key === 'Enter' || e.key === 'Tab') {
                              if (isSearchActive && firstLinkedMatch) {
                                e.preventDefault();
                                handleSelectLinkedParty(firstLinkedMatch);
                              } else if (isSearchActive && filteredLinkedParties.length > 0) {
                                e.preventDefault();
                                handleSelectLinkedParty(filteredLinkedParties[highlightedIndex]);
                              } else if (linkedParty) {
                                e.preventDefault();
                                amountInputRef.current?.focus();
                              }
                            }
                          }} 
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 z-10 pointer-events-none" />
                        {isLinkedSearchOpen && filteredLinkedParties.length > 0 && (
                          <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl dark:shadow-none max-h-60 overflow-y-auto z-50">
                            {filteredLinkedParties.map((p, i) => (
                              <div 
                                key={p.id} 
                                onClick={() => handleSelectLinkedParty(p)} 
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
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Amount (₹)</label>
                      <input 
                        ref={amountInputRef} 
                        required 
                        type="number" 
                        step="0.01" 
                        placeholder="3000 (CR) or -3000 (DR)" 
                        className={`w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-black text-xl transition-colors ${getAmountColorClass()}`} 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            remarksInputRef.current?.focus();
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Narration / Remarks</label>
                      <div className="relative">
                        <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input 
                          ref={remarksInputRef}
                          placeholder="Enter details..." 
                          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none font-medium text-slate-800 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600" 
                          value={remarks} 
                          onChange={(e) => setRemarks(e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting || !amount || parseFloat(amount) === 0 || !linkedParty || isOldRecordsView} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 h-[52px] w-full md:w-auto shrink-0"
                  >
                    {submitting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Save Entry'}
                  </button>
                </form>
              </div>
            </div>
            <div className="w-full lg:w-64 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 flex flex-row lg:flex-col flex-wrap lg:flex-nowrap gap-2 shrink-0 shadow-sm transition-colors duration-200">
              {sidebarButtons.map((btn) => (
                <button 
                  key={btn.name} 
                  onClick={btn.action} 
                  disabled={btn.disabled} 
                  className={`w-[calc(50%-4px)] sm:w-auto lg:w-full flex items-center gap-2.5 lg:gap-4 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl font-bold text-xs lg:text-sm transition-all hover:scale-[1.02] active:scale-95 ${
                    btn.color.includes('bg-slate-100') ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' : btn.color
                  } ${btn.disabled ? 'opacity-30 cursor-not-allowed scale-100' : ''}`}
                >
                  {btn.icon}
                  {btn.name}
                </button>
              ))}
              <div className="hidden lg:block lg:flex-grow"></div>
              <div className="w-full lg:w-auto p-3 lg:p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex lg:flex-col justify-between lg:justify-center items-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest lg:mb-1">Status</p>
                <div className="text-sm font-black text-slate-900 dark:text-white">{selectedTnsIds.size > 0 ? `${selectedTnsIds.size} Selected` : 'None'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Refactored Modular Modals */}
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        isEditLinkedSearchOpen={isEditLinkedSearchOpen}
        setIsEditLinkedSearchOpen={setIsEditLinkedSearchOpen}
        editHighlightedIndex={editHighlightedIndex}
        setEditHighlightedIndex={setEditHighlightedIndex}
        filteredEditLinkedParties={filteredEditLinkedParties}
        firstEditLinkedMatch={firstEditLinkedMatch}
        selectEditLinkedParty={selectEditLinkedParty}
        onSave={saveModification}
        submitting={submitting}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <DcReportModal
        isOpen={isDcModalOpen}
        onClose={() => setIsDcModalOpen(false)}
        dcFromDate={dcFromDate}
        setDcFromDate={setDcFromDate}
        dcToDate={dcToDate}
        setDcToDate={setDcToDate}
        fetchDcReport={fetchDcReport}
        isDcLoading={isDcLoading}
        dcReportData={dcReportData}
        setDcReportData={setDcReportData}
      />
      </div>

      {/* Premium Printable PDF Layout */}
      {selectedParty && (
        <LedgerPrintLayout
          selectedParty={selectedParty}
          printTransactions={printTransactions}
          printTotalCredit={printTotalCredit}
          printTotalDebit={printTotalDebit}
          printFinalBalance={printFinalBalance}
        />
      )}
    </>
  );
};

export default LedgerView;
