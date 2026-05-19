import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface CommissionTransaction {
  id: string;
  transaction_date: string;
  remarks: string;
  credit: number;
  debit: number;
  balance: number;
  linked_transaction_id: string | null;
  partner_party_name?: string;
}

interface PartyContribution {
  name: string;
  amount: number;
  percentage: number;
  count: number;
}

const ProfitLossReport = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [commissionParty, setCommissionParty] = useState<any>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  // Stats States
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [partyContributions, setPartyContributions] = useState<PartyContribution[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Search Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildFilteredQuery = (partyId: string, selectFields = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }) => {
    if (!user) return null;
    let q = supabase
      .from('transactions')
      .select(selectFields, options)
      .eq('party_id', partyId);

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

  const fetchData = async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch the commission party first if we haven't already
      let activeParty = commissionParty;
      if (!activeParty) {
        const { data: partyData, error: partyErr } = await supabase
          .from('parties')
          .select('*')
          .eq('user_id', user.id)
          .eq('system_type', 'commission')
          .maybeSingle();

        if (partyErr) throw partyErr;

        if (!partyData) {
          setCommissionParty(null);
          setTransactions([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        activeParty = partyData;
        setCommissionParty(partyData);
      }

      // 2. Fetch current page transactions & count
      const pageQ = buildFilteredQuery(activeParty.id, '*', { count: 'exact' });
      if (!pageQ) return;

      const { data: pageData, count, error: pageErr } = await pageQ
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (pageErr) throw pageErr;

      const rawTns = (pageData || []) as any as CommissionTransaction[];
      setTotalEntries(count || 0);

      // Resolve partner names for this page's transactions
      const pageLinkedIds = rawTns.map(t => t.linked_transaction_id).filter(Boolean) as string[];
      if (pageLinkedIds.length > 0) {
        const { data: partnerData, error: partnerErr } = await supabase
          .from('transactions')
          .select('linked_transaction_id, party_id, parties(party_name)')
          .in('linked_transaction_id', pageLinkedIds)
          .neq('party_id', activeParty.id);

        if (!partnerErr && partnerData) {
          const partnerMap = new Map<string, string>();
          partnerData.forEach((p: any) => {
            const pName = Array.isArray(p.parties)
              ? (p.parties[0] as any)?.party_name
              : (p.parties as any)?.party_name;
            partnerMap.set(p.linked_transaction_id, pName || 'System');
          });

          rawTns.forEach(t => {
            if (t.linked_transaction_id) {
              t.partner_party_name = partnerMap.get(t.linked_transaction_id) || 'System / Direct';
            } else {
              t.partner_party_name = 'Direct Entry';
            }
          });
        }
      } else {
        rawTns.forEach(t => {
          t.partner_party_name = 'Direct Entry';
        });
      }

      setTransactions(rawTns);

      // 3. Fetch aggregates and contributions matching the filters
      const statsQ = buildFilteredQuery(activeParty.id, 'credit, debit, linked_transaction_id');
      if (statsQ) {
        const { data: allMatching, error: statsErr } = await statsQ;

        if (!statsErr && allMatching) {
          const matchingList = allMatching as any[];
          const creditSum = matchingList.reduce((sum, t) => sum + t.credit, 0);
          const debitSum = matchingList.reduce((sum, t) => sum + t.debit, 0);
          setTotalEarned(creditSum);
          setTotalPayout(debitSum);

          // Get linked counterpart names to build the contributors chart
          const allLinkedIds = matchingList.map(t => t.linked_transaction_id).filter(Boolean) as string[];

          if (allLinkedIds.length > 0) {
            const { data: allPartners, error: partnersErr } = await supabase
              .from('transactions')
              .select('linked_transaction_id, parties(party_name)')
              .in('linked_transaction_id', allLinkedIds)
              .neq('party_id', activeParty.id);

            if (!partnersErr && allPartners) {
              const partnerMap = new Map<string, string>();
              allPartners.forEach((p: any) => {
                const pName = Array.isArray(p.parties)
                  ? (p.parties[0] as any)?.party_name
                  : (p.parties as any)?.party_name;
                partnerMap.set(p.linked_transaction_id, pName || 'System');
              });

              const contributionsMap = new Map<string, { amount: number; count: number }>();
              matchingList.forEach(t => {
                if (t.credit > 0) {
                  const name = t.linked_transaction_id ? (partnerMap.get(t.linked_transaction_id) || 'System / Direct') : 'Direct Entry';
                  const existing = contributionsMap.get(name) || { amount: 0, count: 0 };
                  contributionsMap.set(name, {
                    amount: existing.amount + t.credit,
                    count: existing.count + 1
                  });
                }
              });

              const list: PartyContribution[] = [];
              contributionsMap.forEach((val, name) => {
                list.push({
                  name,
                  amount: val.amount,
                  percentage: creditSum > 0 ? (val.amount / creditSum) * 100 : 0,
                  count: val.count
                });
              });
              list.sort((a, b) => b.amount - a.amount);
              setPartyContributions(list);
            }
          } else {
            setPartyContributions([]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profit/loss data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, currentPage, startDate, endDate, debouncedSearch]);

  const netProfit = totalEarned - totalPayout;
  const totalPages = Math.ceil(totalEntries / ITEMS_PER_PAGE);

  if (loading) return <GlobalLoader fullScreen={true} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Profit &amp; Loss Report</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Analyze your commission revenues, payouts, and net performance.</p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm shrink-0 self-start md:self-auto"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!commissionParty ? (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-8 flex items-start gap-4">
          <Info className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-400 text-lg mb-1">Commission Party Missing</h3>
            <p className="text-amber-700 dark:text-amber-500 text-sm leading-relaxed">
              No system party with the identifier type <strong>'commission'</strong> was found. Commissions from transfers are accumulated in this system account. Please make sure you have initialized your system accounts.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Revenue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-400 dark:text-slate-600">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gross Commission</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                ₹ {totalEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-2 font-medium">Cumulative earnings from transactions</p>
            </div>

            {/* Total Expenses / Payouts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-400 dark:text-slate-600">
                <TrendingDown className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Payouts &amp; Deductions</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                ₹ {totalPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-2 font-medium">Withdrawals or negative adjustments</p>
            </div>

            {/* Net Profit */}
            <div className={`border rounded-3xl p-6 shadow-xs relative overflow-hidden group transition-all duration-300 ${netProfit >= 0
                ? 'bg-gradient-to-tr from-emerald-600/5 to-teal-600/5 border-emerald-200 dark:border-emerald-900/30'
                : 'bg-gradient-to-tr from-rose-600/5 to-orange-600/5 border-rose-200 dark:border-rose-900/30'
              }`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-400 dark:text-slate-600">
                <DollarSign className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfit >= 0
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none'
                    : 'bg-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-none'
                  }`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className={`text-sm font-bold uppercase tracking-wider ${netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>Net Profit (Balance)</span>
              </div>
              <h2 className={`text-3xl font-black ${netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                ₹ {Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-bold ml-1.5">{netProfit >= 0 ? 'CR' : 'DR'}</span>
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-550 mt-2 font-medium">Net system value in commission reserve</p>
            </div>
          </div>

          {/* Breakdown and Filter Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* Filter Panel & Party breakdown */}
            <div className="lg:col-span-1 space-y-6">
              {/* Filter Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Filter Reports</h3>

                {/* Search Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      placeholder="Remarks or party..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-sm text-slate-850 dark:text-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Date range filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs text-slate-850 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs text-slate-850 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Commission Contributors Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-6">
                  <PieChart className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Sources breakdown</h3>
                </div>

                <div className="space-y-4">
                  {partyContributions.slice(0, 6).map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{item.name}</span>
                        <div className="flex gap-2">
                          <span className="text-slate-450">{item.count} items</span>
                          <span className="text-indigo-600 dark:text-indigo-400">₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {partyContributions.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-6">No commission earnings to display.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed History Table */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Ledger Entries</h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-500 font-bold uppercase tracking-wider">
                  {totalEntries} records
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-450 font-bold text-xs uppercase tracking-wider">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Source Account</th>
                      <th className="px-6 py-4">Remarks</th>
                      <th className="px-6 py-4 text-right">Earning (CR)</th>
                      <th className="px-6 py-4 text-right">Payout (DR)</th>
                      <th className="px-6 py-4 text-right">Balance</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-slate-800 dark:text-slate-300">
                          {t.partner_party_name}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {t.remarks || '-'}
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
                        <td colSpan={6} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 italic">
                          No transactions found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                  <p className="text-xs font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 transition-all text-slate-600 dark:text-slate-400"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 transition-all text-slate-600 dark:text-slate-400"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitLossReport;
