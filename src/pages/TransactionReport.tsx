import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Calendar,
  Layers,
  Printer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface Transaction {
  id: string;
  party_id: string;
  transaction_date: string;
  remarks: string;
  tns_type: 'CR' | 'DR';
  credit: number;
  debit: number;
  balance: number;
  is_settlement: boolean;
  is_finalized: boolean;
  linked_transaction_id: string | null;
  parties?: {
    party_name: string;
    system_type: string;
    status: string;
    sr_no: string;
  };
  partner_party_name?: string;
}

interface PartyOption {
  id: string;
  party_name: string;
  sr_no: string;
}

const TransactionReport = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);

  // Stats States
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('all');
  const [tnsTypeFilter, setTnsTypeFilter] = useState<'all' | 'CR' | 'DR'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Search Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildFilteredQuery = (selectFields = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }) => {
    if (!user) return null;
    let q = supabase
      .from('transactions')
      .select(selectFields, options)
      .eq('user_id', user.id);

    if (selectedPartyId !== 'all') {
      q = q.eq('party_id', selectedPartyId);
    }
    if (tnsTypeFilter === 'CR') {
      q = q.gt('credit', 0);
    } else if (tnsTypeFilter === 'DR') {
      q = q.gt('debit', 0);
    }
    if (statusFilter === 'active') {
      q = q.eq('is_finalized', false);
    } else if (statusFilter === 'archived') {
      q = q.eq('is_finalized', true);
    }
    if (startDate) {
      q = q.gte('transaction_date', startDate);
    }
    if (endDate) {
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);
      q = q.lte('transaction_date', adjustedEndDate.toISOString());
    }
    if (debouncedSearch) {
      q = q.ilike('remarks', `%${debouncedSearch}%`);
    }
    return q;
  };

  const fetchParties = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('id, party_name, sr_no')
        .eq('user_id', user.id)
        .order('party_name', { ascending: true });
      if (error) throw error;
      setParties(data || []);
    } catch (err) {
      console.error('Error fetching parties dropdown:', err);
    }
  };

  const fetchData = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const pageQ = buildFilteredQuery('*, parties(party_name, system_type, status, sr_no)', { count: 'exact' });
      if (!pageQ) return;

      // 1. Fetch current page transactions & count
      const { data, count, error } = await pageQ
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const rawTns = (data || []) as any as Transaction[];
      setTotalEntries(count || 0);

      // 2. Resolve counterpart names for the current page transactions
      const linkedIds = rawTns.map(t => t.linked_transaction_id).filter(Boolean) as string[];
      let processedTns = rawTns.map(t => ({ ...t, partner_party_name: '-' }));

      if (linkedIds.length > 0) {
        const { data: partnerData, error: partnerErr } = await supabase
          .from('transactions')
          .select('linked_transaction_id, party_id, parties(party_name)')
          .in('linked_transaction_id', linkedIds);

        if (!partnerErr && partnerData) {
          processedTns = rawTns.map(t => {
            let partnerName = '-';
            if (t.linked_transaction_id) {
              const partner = partnerData.find(p => p.linked_transaction_id === t.linked_transaction_id && p.party_id !== t.party_id);
              if (partner && partner.parties) {
                const pName = Array.isArray(partner.parties)
                  ? (partner.parties[0] as any)?.party_name
                  : (partner.parties as any)?.party_name;
                if (pName) {
                  partnerName = pName;
                }
              }
            }
            return {
              ...t,
              partner_party_name: partnerName
            };
          });
        }
      }

      setTransactions(processedTns);

      // 3. Fetch stats aggregates for the entire filtered set in background
      const statsQ = buildFilteredQuery('credit, debit');
      if (statsQ) {
        const { data: statsData, error: statsErr } = await statsQ;
        if (!statsErr && statsData) {
          const statsList = statsData as any[];
          const creditSum = statsList.reduce((sum, t) => sum + t.credit, 0);
          const debitSum = statsList.reduce((sum, t) => sum + t.debit, 0);
          const volumeSum = statsList.reduce((sum, t) => sum + Math.max(t.credit, t.debit), 0);
          
          setTotalCredit(creditSum);
          setTotalDebit(debitSum);
          setTotalVolume(volumeSum);
        }
      }
    } catch (err) {
      console.error('Error fetching transactions report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [user, currentPage, selectedPartyId, tnsTypeFilter, statusFilter, startDate, endDate, debouncedSearch]);

  const totalPages = Math.ceil(totalEntries / ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedPartyId('all');
    setTnsTypeFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <GlobalLoader fullScreen={true} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 transaction-report-container">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 dark:shadow-none">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-left">Transaction Report</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Search, filter and analyze transactions across all party ledgers.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          
          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-3 bg-blue-650 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-blue-100 dark:shadow-none"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Dashboard - Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Filter Panel</h3>
          </div>

          {/* Search Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Search Narration</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
              <input 
                placeholder="Search remarks..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Party Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Filter by Party</label>
            <select
              value={selectedPartyId}
              onChange={e => { setSelectedPartyId(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all appearance-none"
            >
              <option value="all">All Parties</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  ({p.sr_no}) {p.party_name}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Transaction Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'CR', 'DR'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => { setTnsTypeFilter(type); setCurrentPage(1); }}
                  className={`py-2 rounded-xl text-xs font-black border transition-all ${
                    tnsTypeFilter === type 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'CR' ? 'Credit' : 'Debit'}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Archive Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'active', 'archived'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`py-2 rounded-xl text-xs font-black border transition-all ${
                    statusFilter === status 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Settled'}
                </button>
              ))}
            </div>
          </div>

          {/* Date range filters */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Start Date
              </label>
              <input 
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs text-slate-800 dark:text-white"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> End Date
              </label>
              <input 
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2">
            <button 
              onClick={resetFilters}
              className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl transition-all"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Detailed History Table & Stats */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Volume</p>
              <h4 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                ₹ {totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h4>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Credit (CR)</p>
              <h4 className="text-xl md:text-2xl font-black text-emerald-600">
                ₹ {totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h4>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Debit (DR)</p>
              <h4 className="text-xl md:text-2xl font-black text-rose-650 dark:text-rose-500">
                ₹ {totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h4>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Transactions List</h3>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-500 font-bold uppercase tracking-wider">
                {totalEntries} entries
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-450 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Party A/C</th>
                    <th className="px-6 py-4">Transfer To (Partner)</th>
                    <th className="px-6 py-4">Remarks</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Credit (CR)</th>
                    <th className="px-6 py-4 text-right">Debit (DR)</th>
                    <th className="px-6 py-4 text-right">Running Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-bold">
                        {new Date(t.transaction_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {t.parties ? (
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-bold">{t.parties.party_name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">SR: {t.parties.sr_no}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-350">
                        {t.partner_party_name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-455">
                        {t.remarks || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {t.is_settlement ? (
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/40 text-violet-750 dark:text-violet-400 rounded-md font-black text-[9px] uppercase">Settlement</span>
                        ) : t.is_finalized ? (
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-750 dark:text-orange-400 rounded-md font-black text-[9px] uppercase">Archived</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/40 text-blue-750 dark:text-blue-400 rounded-md font-black text-[9px] uppercase">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-bold whitespace-nowrap">
                        {t.credit > 0 ? `₹ ${t.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-rose-600 font-bold whitespace-nowrap">
                        {t.debit > 0 ? `₹ ${t.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">
                        ₹ {t.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-slate-400 dark:text-slate-500 italic">
                        No transactions match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <p className="text-xs font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)} 
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 transition-all text-slate-650 dark:text-slate-400"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(prev => prev + 1)} 
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 transition-all text-slate-650 dark:text-slate-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TransactionReport;
