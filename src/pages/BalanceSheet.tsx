import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Printer, 
  RefreshCcw, 
  XCircle, 
  Search, 
  HelpCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface PartyBalance {
  id: string;
  party_name: string;
  sr_no: string;
  status: 'take' | 'give';
  system_type: 'normal' | 'commission' | 'escrow';
  balance: number;
}

const BalanceSheet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parties, setParties] = useState<PartyBalance[]>(() => {
    try {
      const cached = localStorage.getItem('cached_balance_sheet');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_balance_sheet');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [creditPage, setCreditPage] = useState(1);
  const [debitPage, setDebitPage] = useState(1);
  const [zeroPage, setZeroPage] = useState(1);

  // Reset pages on search or zero-balance toggle
  useEffect(() => {
    setCreditPage(1);
    setDebitPage(1);
    setZeroPage(1);
  }, [searchQuery, showZeroBalances]);


  // Find first case-insensitive start-matching party for inline ghost autocomplete
  const firstBalanceMatch = searchQuery
    ? parties.find(p => p.party_name.toLowerCase().startsWith(searchQuery.toLowerCase()) || p.sr_no.toLowerCase().startsWith(searchQuery.toLowerCase()))
    : null;

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch parties and their latest transaction in a single query using nested limits
      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select(`
          id,
          party_name,
          sr_no,
          status,
          system_type,
          transactions (
            balance,
            transaction_date,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { foreignTable: 'transactions', ascending: false })
        .order('created_at', { foreignTable: 'transactions', ascending: false })
        .limit(1, { foreignTable: 'transactions' });

      if (partiesError) throw partiesError;

      // Combine parties with their latest balance
      const mappedParties: PartyBalance[] = (partiesData || []).map(p => {
        const tns = p.transactions as any[];
        const bal = tns && tns.length > 0 ? tns[0].balance : 0;
        return {
          id: p.id,
          party_name: p.party_name,
          sr_no: p.sr_no,
          status: p.status as 'take' | 'give',
          system_type: p.system_type as 'normal' | 'commission' | 'escrow',
          balance: bal
        };
      });

      // Sort by sr_no or name for consistent display
      mappedParties.sort((a, b) => {
        const numA = parseInt(a.sr_no) || 0;
        const numB = parseInt(b.sr_no) || 0;
        return numA - numB || a.party_name.localeCompare(b.party_name);
      });

      setParties(mappedParties);
      try {
        localStorage.setItem('cached_balance_sheet', JSON.stringify(mappedParties));
      } catch (e) {
        console.error('Error caching balance sheet:', e);
      }
    } catch (err) {
      console.error('Error fetching trial balance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Apply search filter and zero balance filter
  const filteredParties = parties.filter(p => {
    const matchesSearch = p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sr_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZero = showZeroBalances ? true : p.balance !== 0;
    return matchesSearch && matchesZero;
  });

  // Separate Credit (jama / dena) and Debit (name / lena)
  // Positive balances are Credit (jama / dena)
  // Negative balances are Debit (name / lena)
  const creditParties = filteredParties.filter(p => p.balance > 0);
  const debitParties = filteredParties.filter(p => p.balance < 0);
  const zeroParties = filteredParties.filter(p => p.balance === 0);

  const ITEMS_PER_PAGE_SHEET = 20;

  // Credit Pagination
  const totalCreditPages = Math.ceil(creditParties.length / ITEMS_PER_PAGE_SHEET);
  const paginatedCredit = creditParties.slice((creditPage - 1) * ITEMS_PER_PAGE_SHEET, creditPage * ITEMS_PER_PAGE_SHEET);
  const halfCredit = Math.ceil(paginatedCredit.length / 2);
  const creditCol1 = paginatedCredit.slice(0, halfCredit);
  const creditCol2 = paginatedCredit.slice(halfCredit);

  // Debit Pagination
  const totalDebitPages = Math.ceil(debitParties.length / ITEMS_PER_PAGE_SHEET);
  const paginatedDebit = debitParties.slice((debitPage - 1) * ITEMS_PER_PAGE_SHEET, debitPage * ITEMS_PER_PAGE_SHEET);
  const halfDebit = Math.ceil(paginatedDebit.length / 2);
  const debitCol1 = paginatedDebit.slice(0, halfDebit);
  const debitCol2 = paginatedDebit.slice(halfDebit);

  // Zero Balance Pagination
  const totalZeroPages = Math.ceil(zeroParties.length / ITEMS_PER_PAGE_SHEET);
  const paginatedZero = zeroParties.slice((zeroPage - 1) * ITEMS_PER_PAGE_SHEET, zeroPage * ITEMS_PER_PAGE_SHEET);
  const halfZero = Math.ceil(paginatedZero.length / 2);
  const zeroCol1 = paginatedZero.slice(0, halfZero);
  const zeroCol2 = paginatedZero.slice(halfZero);

  // Sum calculation of all credit and debit accounts (always over entire dataset!)
  const totalCredit = creditParties.reduce((sum, p) => sum + p.balance, 0);
  const totalDebit = debitParties.reduce((sum, p) => sum + p.balance, 0);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <GlobalLoader fullScreen={true} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 balance-sheet-container">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm print:hidden transition-colors duration-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 dark:shadow-none">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Final Trial Balance</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Real-time Credit &amp; Debit Ledger sheet</p>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative w-full md:w-64 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/70 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
          {firstBalanceMatch && (
            <div className="absolute inset-0 pl-10 pr-4 py-2.5 pointer-events-none flex items-center font-bold text-sm text-slate-400 dark:text-slate-400 select-none z-0">
              <span className="text-transparent">{searchQuery}</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg px-2 py-0.5 text-xs font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                {firstBalanceMatch.party_name.slice(searchQuery.length)}
                <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-1 text-[9px] text-blue-500 font-black shadow-xs">TAB</kbd>
              </span>
            </div>
          )}
          <input 
            placeholder="Party Name..." 
            className="w-full pl-10 pr-4 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800 dark:text-white relative z-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === 'Tab') && firstBalanceMatch) {
                e.preventDefault();
                setSearchQuery(firstBalanceMatch.party_name);
              }
            }}
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zero Balance Toggle */}
          <button
            onClick={() => setShowZeroBalances(!showZeroBalances)}
            title={showZeroBalances ? "Hide Zero Balance Accounts" : "Show Zero Balance Accounts"}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs border transition-all ${
              showZeroBalances 
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {showZeroBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showZeroBalances ? "Hide Zero Bal" : "Show Zero Bal"}
          </button>

          {/* Show / Refresh */}
          <button 
            onClick={fetchData}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {/* Print */}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 dark:shadow-none rounded-xl font-bold text-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          {/* Exit */}
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 dark:shadow-none rounded-xl font-bold text-xs transition-all"
          >
            <XCircle className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </div>

      {/* Screen Title for Print only */}
      <div className="hidden print:flex flex-col items-center justify-center text-center pb-6 border-b-2 border-slate-800 mb-6">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Final Trial Balance</h1>
        <p className="text-sm font-bold text-slate-600 mt-1">Date Generated: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {/* Main Trial Balance Two Panels Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start sheet-panels-grid print:hidden">
        
        {/* ================= LEFT SIDE: CREDIT / JAMA / DENA ================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full print:border-slate-800 print:rounded-none transition-colors duration-200">
          {/* Header */}
          <div className="px-6 py-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-800">
            <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Credit / Jama / Dena Accounts</h2>
          </div>

          {/* Sub-columns container */}
          <div className="p-6 flex-grow print:p-2">
            {/* Desktop Layout: Two parallel columns (hidden on mobile, grid on md+) */}
            <div className="hidden md:grid grid-cols-2 gap-4 divide-x divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
              {/* Table Column 1 */}
              <div className="pr-2">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                      <th className="py-2">Name</th>
                      <th className="py-2 text-right">Amount (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40 print:divide-slate-200">
                    {creditCol1.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                          {p.party_name}
                        </td>
                        <td className="py-2 text-right text-emerald-600 dark:text-emerald-455 font-extrabold">
                          ₹ {p.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {creditCol1.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">No records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Column 2 */}
              <div className="pl-4 print:pl-2">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                      <th className="py-2">Name</th>
                      <th className="py-2 text-right">Amount (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40 print:divide-slate-200">
                    {creditCol2.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                          {p.party_name}
                        </td>
                        <td className="py-2 text-right text-emerald-600 dark:text-emerald-455 font-extrabold">
                          ₹ {p.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {creditCol2.length === 0 && creditCol1.length > 0 && (
                      <tr>
                        <td colSpan={2} className="py-2 text-center text-slate-300 dark:text-slate-600 italic">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Layout: Single unified table (visible on mobile, hidden on md+) */}
            <div className="block md:hidden">
              <table className="w-full text-left text-xs font-bold">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Name</th>
                    <th className="py-2 text-right">Amount (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40">
                  {paginatedCredit.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                      <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                        {p.party_name}
                      </td>
                      <td className="py-2 text-right text-emerald-600 dark:text-emerald-455 font-extrabold">
                        ₹ {p.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {paginatedCredit.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">No records.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit Pagination controls */}
          {totalCreditPages > 1 && (
            <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-950/10 text-slate-500 dark:text-slate-400 font-bold text-[10px]">
              <span className="uppercase tracking-wider">Page {creditPage} of {totalCreditPages}</span>
              <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={creditPage === 1}
                  onClick={() => setCreditPage(prev => Math.max(1, prev - 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={creditPage === totalCreditPages}
                  onClick={() => setCreditPage(prev => Math.min(totalCreditPages, prev + 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Total */}
          <div className="px-6 py-4 bg-emerald-600 dark:bg-emerald-900 text-white font-black text-lg flex justify-between items-center tracking-tight print:bg-emerald-600 print:text-white print:border-t print:border-emerald-700">
            <span>Credit / Jama / Dena Total</span>
            <span>₹ {totalCredit.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* ================= RIGHT SIDE: DEBIT / NAME / LENA ================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full print:border-slate-800 print:rounded-none transition-colors duration-200">
          {/* Header */}
          <div className="px-6 py-4 bg-rose-50/50 dark:bg-rose-950/10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-800">
            <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Debit / Name / Lena Accounts</h2>
          </div>

          {/* Sub-columns container */}
          <div className="p-6 flex-grow print:p-2">
            {/* Desktop Layout: Two parallel columns (hidden on mobile, grid on md+) */}
            <div className="hidden md:grid grid-cols-2 gap-4 divide-x divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
              {/* Table Column 1 */}
              <div className="pr-2">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                      <th className="py-2">Name</th>
                      <th className="py-2 text-right">Amount (Dr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40 print:divide-slate-200">
                    {debitCol1.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                          {p.party_name}
                        </td>
                        <td className="py-2 text-right text-rose-600 dark:text-rose-455 font-extrabold">
                          ₹ {Math.abs(p.balance).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {debitCol1.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">No records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Column 2 */}
              <div className="pl-4 print:pl-2">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
                      <th className="py-2">Name</th>
                      <th className="py-2 text-right">Amount (Dr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40 print:divide-slate-200">
                    {debitCol2.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                          {p.party_name}
                        </td>
                        <td className="py-2 text-right text-rose-600 dark:text-rose-455 font-extrabold">
                          ₹ {Math.abs(p.balance).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {debitCol2.length === 0 && debitCol1.length > 0 && (
                      <tr>
                        <td colSpan={2} className="py-2 text-center text-slate-300 dark:text-slate-600 italic">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Layout: Single unified table (visible on mobile, hidden on md+) */}
            <div className="block md:hidden">
              <table className="w-full text-left text-xs font-bold">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Name</th>
                    <th className="py-2 text-right">Amount (Dr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40">
                  {paginatedDebit.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                      <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                        {p.party_name}
                      </td>
                      <td className="py-2 text-right text-rose-600 dark:text-rose-455 font-extrabold">
                        ₹ {Math.abs(p.balance).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {paginatedDebit.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">No records.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Debit Pagination controls */}
          {totalDebitPages > 1 && (
            <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-950/10 text-slate-500 dark:text-slate-400 font-bold text-[10px]">
              <span className="uppercase tracking-wider">Page {debitPage} of {totalDebitPages}</span>
              <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={debitPage === 1}
                  onClick={() => setDebitPage(prev => Math.max(1, prev - 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={debitPage === totalDebitPages}
                  onClick={() => setDebitPage(prev => Math.min(totalDebitPages, prev + 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Total */}
          <div className="px-6 py-4 bg-rose-600 dark:bg-rose-900 text-white font-black text-lg flex justify-between items-center tracking-tight print:bg-rose-600 print:text-white print:border-t print:border-rose-700">
            <span>Debit / Name / Lena Total</span>
            <span>₹ {Math.abs(totalDebit).toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* Print-only section with ALL Credit/Debit entries */}
      <div className="hidden print:grid grid-cols-2 gap-6 items-start sheet-panels-grid">
        {/* ================= PRINT CREDIT PANEL ================= */}
        <div className="border-2 border-slate-800 flex flex-col h-full">
          <div className="px-4 py-2 bg-slate-100 border-b-2 border-slate-800 text-center">
            <h2 className="text-sm font-black text-slate-900 uppercase">Credit / Jama / Dena Accounts</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-4 flex-grow divide-x-2 divide-slate-300">
            <div className="pr-1">
              <table className="w-full text-left text-[9px] font-bold">
                <thead>
                  <tr className="font-black text-slate-800 uppercase border-b-2 border-slate-800">
                    <th className="py-1">Name</th>
                    <th className="py-1 text-right">Amount (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {creditParties.slice(0, Math.ceil(creditParties.length / 2)).map(p => (
                    <tr key={p.id}>
                      <td className="py-1 text-slate-900 max-w-[110px] truncate">{p.party_name}</td>
                      <td className="py-1 text-right text-slate-900 font-extrabold">₹ {p.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pl-3">
              <table className="w-full text-left text-[9px] font-bold">
                <thead>
                  <tr className="font-black text-slate-800 uppercase border-b-2 border-slate-800">
                    <th className="py-1">Name</th>
                    <th className="py-1 text-right">Amount (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {creditParties.slice(Math.ceil(creditParties.length / 2)).map(p => (
                    <tr key={p.id}>
                      <td className="py-1 text-slate-900 max-w-[110px] truncate">{p.party_name}</td>
                      <td className="py-1 text-right text-slate-900 font-extrabold">₹ {p.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-600 text-white font-black text-xs flex justify-between items-center border-t-2 border-emerald-700">
            <span>Credit Total</span>
            <span>₹ {totalCredit.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* ================= PRINT DEBIT PANEL ================= */}
        <div className="border-2 border-slate-800 flex flex-col h-full">
          <div className="px-4 py-2 bg-slate-100 border-b-2 border-slate-800 text-center">
            <h2 className="text-sm font-black text-slate-900 uppercase">Debit / Name / Lena Accounts</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-4 flex-grow divide-x-2 divide-slate-300">
            <div className="pr-1">
              <table className="w-full text-left text-[9px] font-bold">
                <thead>
                  <tr className="font-black text-slate-800 uppercase border-b-2 border-slate-800">
                    <th className="py-1">Name</th>
                    <th className="py-1 text-right">Amount (Dr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {debitParties.slice(0, Math.ceil(debitParties.length / 2)).map(p => (
                    <tr key={p.id}>
                      <td className="py-1 text-slate-900 max-w-[110px] truncate">{p.party_name}</td>
                      <td className="py-1 text-right text-slate-900 font-extrabold">₹ {Math.abs(p.balance).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pl-3">
              <table className="w-full text-left text-[9px] font-bold">
                <thead>
                  <tr className="font-black text-slate-800 uppercase border-b-2 border-slate-800">
                    <th className="py-1">Name</th>
                    <th className="py-1 text-right">Amount (Dr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {debitParties.slice(Math.ceil(debitParties.length / 2)).map(p => (
                    <tr key={p.id}>
                      <td className="py-1 text-slate-900 max-w-[110px] truncate">{p.party_name}</td>
                      <td className="py-1 text-right text-slate-900 font-extrabold">₹ {Math.abs(p.balance).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-4 py-2 bg-rose-600 text-white font-black text-xs flex justify-between items-center border-t-2 border-rose-700">
            <span>Debit Total</span>
            <span>₹ {Math.abs(totalDebit).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

        {showZeroBalances && zeroParties.length > 0 && (
        <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col transition-colors duration-200 print:hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-0 flex items-center gap-2 tracking-tight">
              <HelpCircle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              Fully Balanced Accounts (Zero Balance)
            </h3>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black px-2.5 py-1 rounded-lg">
              {zeroParties.length} Accounts
            </span>
          </div>

          <div className="p-6 flex-grow">
            {/* Desktop Layout: Two parallel columns (hidden on mobile, grid on md+) */}
            <div className="hidden md:grid grid-cols-2 gap-4 divide-x divide-slate-100 dark:divide-slate-800">
              {/* Table Column 1 */}
              <div className="pr-2">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-2 w-12">SR</th>
                      <th className="py-2">Name</th>
                      <th className="py-2 text-center">Status</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40">
                    {zeroCol1.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-2 text-slate-400 dark:text-slate-500 font-bold">{p.sr_no}</td>
                        <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                          {p.party_name}
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/30">
                            Settled
                          </span>
                        </td>
                        <td className="py-2 text-right text-slate-400 dark:text-slate-500">₹ 0</td>
                      </tr>
                    ))}
                    {zeroCol1.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">No records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Column 2 */}
              <div className="pl-4">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="py-2 w-12">SR</th>
                      <th className="py-2">Name</th>
                      <th className="py-2 text-center">Status</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40">
                    {zeroCol2.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-2 text-slate-400 dark:text-slate-500 font-bold">{p.sr_no}</td>
                        <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                          {p.party_name}
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/30">
                            Settled
                          </span>
                        </td>
                        <td className="py-2 text-right text-slate-400 dark:text-slate-500">₹ 0</td>
                      </tr>
                    ))}
                    {zeroCol2.length === 0 && zeroCol1.length > 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center text-slate-300 dark:text-slate-650 italic">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Layout: Single unified table (visible on mobile, hidden on md+) */}
            <div className="block md:hidden">
              <table className="w-full text-left text-xs font-bold">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 w-12">SR</th>
                    <th className="py-2">Name</th>
                    <th className="py-2 text-center">Status</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50/60 dark:divide-slate-800/40">
                  {paginatedZero.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                      <td className="py-2 text-slate-400 dark:text-slate-500 font-bold">{p.sr_no}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300 max-w-[120px] truncate" title={p.party_name}>
                        {p.party_name}
                      </td>
                      <td className="py-2 text-center">
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/30">
                          Settled
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-400 dark:text-slate-500">₹ 0</td>
                    </tr>
                  ))}
                  {paginatedZero.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 dark:text-slate-500 italic">No records.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zero Balance Pagination controls */}
          {totalZeroPages > 1 && (
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-950/10 text-slate-500 dark:text-slate-400 font-bold text-[10px]">
              <span className="uppercase tracking-wider">Page {zeroPage} of {totalZeroPages}</span>
              <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={zeroPage === 1}
                  onClick={() => setZeroPage(prev => Math.max(1, prev - 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={zeroPage === totalZeroPages}
                  onClick={() => setZeroPage(prev => Math.min(totalZeroPages, prev + 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print CSS Injector */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, header, footer, .navbar, .navbar-container {
            display: none !important;
          }
          .balance-sheet-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .sheet-panels-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 15px !important;
          }
          table {
            font-size: 10px !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BalanceSheet;
