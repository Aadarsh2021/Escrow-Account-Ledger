import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Calculator, 
  Cloud, 
  RefreshCw, 
  FileText, 
  Layers, 
  Check, 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  BarChart3, 
  Users, 
  Activity,
  Sliders,
  DollarSign
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  // Interactive Live Preview Filter State
  const [demoFilter, setDemoFilter] = useState<'all' | 'escrow' | 'commission' | 'transfer'>('all');

  // Interactive Feature Deep-Dive Tab State
  const [activeTab, setActiveTab] = useState<'double-entry' | 'commissions' | 'reports' | 'security'>('double-entry');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Sample data for the interactive live ledger mockup
  const demoTransactions = [
    {
      id: 'TXN-9021',
      date: '21 Oct 2026',
      party: 'Apex Trade Vault Ltd',
      type: 'escrow',
      category: 'Escrow Deposit',
      debit: '₹ 2,50,000',
      credit: '—',
      commission: '2.5%',
      commissionAmt: '₹ 6,250',
      status: 'Balanced'
    },
    {
      id: 'TXN-9022',
      date: '21 Oct 2026',
      party: 'Horizon Merchant Clearing',
      type: 'commission',
      category: 'Commission Credit',
      debit: '—',
      credit: '₹ 6,250',
      commission: 'Auto',
      commissionAmt: '—',
      status: 'Verified'
    },
    {
      id: 'TXN-9023',
      date: '20 Oct 2026',
      party: 'Nova Capital Escrow',
      type: 'transfer',
      category: 'Party Settlement',
      debit: '—',
      credit: '₹ 1,80,000',
      commission: '1.8%',
      commissionAmt: '₹ 3,240',
      status: 'Balanced'
    },
    {
      id: 'TXN-9024',
      date: '20 Oct 2026',
      party: 'Zenith Global Holdings',
      type: 'escrow',
      category: 'Escrow Release',
      debit: '₹ 1,80,000',
      credit: '—',
      commission: 'Flat',
      commissionAmt: '₹ 2,000',
      status: 'Balanced'
    }
  ];

  const filteredTransactions = demoTransactions.filter((tx) => {
    if (demoFilter === 'all') return true;
    return tx.type === demoFilter;
  });

  const coreFeatures = [
    {
      title: 'Double-Entry Integrity',
      desc: 'Enforces mathematical equilibrium across every voucher entry. Debits strictly match credits in real-time, preventing book discrepancies.',
      icon: <Layers className="w-6 h-6 text-blue-500" />,
      tag: 'Zero Math Errors'
    },
    {
      title: 'Automated Commission Engine',
      desc: 'Define individualized party commission percentages. Payouts and retention cuts are calculated on-the-fly with zero manual recalculation.',
      icon: <Calculator className="w-6 h-6 text-emerald-500" />,
      tag: 'Auto-Splits'
    },
    {
      title: 'Instant Financial Statements',
      desc: 'Produce audit-ready Balance Sheets, Profit & Loss summaries, and detailed Party Ledgers in a single click with instant date range filtering.',
      icon: <BarChart3 className="w-6 h-6 text-indigo-500" />,
      tag: 'Audit Ready'
    },
    {
      title: 'Multi-Party Vault Organization',
      desc: 'Segment clients, vendors, brokers, and escrow agents into structured groups with full transaction timelines and running balances.',
      icon: <Users className="w-6 h-6 text-violet-500" />,
      tag: 'Smart Profiles'
    },
    {
      title: 'Dual Cloud & Offline Backup',
      desc: 'Never lose a single ledger entry. Export local snapshot archives instantly or synchronize encrypted backups directly to cloud storage.',
      icon: <Cloud className="w-6 h-6 text-cyan-500" />,
      tag: 'Zero Data Loss'
    },
    {
      title: 'High-Frequency Rapid Workflow',
      desc: 'Designed for accountants who move fast. Features autocomplete party search, fluid tab navigation, and sub-millisecond query responses.',
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      tag: '0ms Latency'
    }
  ];

  const deepDiveTabs = {
    'double-entry': {
      title: 'True Double-Entry Bookkeeping',
      badge: 'Mathematical Certainty',
      desc: 'Every transaction is recorded with rigorous debit and credit matching. The system refuses to save asymmetric ledger postings, eliminating reconciliations stress at month-end.',
      points: [
        'Automatic debit-credit validation before committing vouchers',
        'Live running balance updates across both affected party ledgers',
        'Immutable audit timestamps for compliance tracking',
        'Single-click transfer entry between complex ledger accounts'
      ],
      stats: '100% Balanced Books Guaranteed'
    },
    'commissions': {
      title: 'Dynamic Commission Automation',
      badge: 'Revenue Protection',
      desc: 'Forget external spreadsheets and manual commission slips. Escrow Ledger computes broker shares, escrow service percentages, and net party balances automatically.',
      points: [
        'Custom per-party default commission percentage rates',
        'Auto-generated commission credit entries to profit accounts',
        'Instant monthly commission earnings & revenue reporting',
        'Real-time commission adjustments during transaction entry'
      ],
      stats: 'Zero Manual Math Errors'
    },
    'reports': {
      title: 'Comprehensive Financial Reports',
      badge: 'Instant Business Intelligence',
      desc: 'View your complete financial status instantly. Balance Sheets, Profit & Loss statements, and Party Ledgers update in real-time as transactions occur.',
      points: [
        'Dynamic date range filtering across any accounting period',
        'Real-time net asset, liability, and equity calculations',
        'Export-ready clean formats for audit and accountant review',
        'Individual party ledger statements with running balance columns'
      ],
      stats: 'Instant One-Click Statements'
    },
    'security': {
      title: 'Bank-Grade Data Protection',
      badge: 'Security & Redundancy',
      desc: 'Your financial ledger is your business backbone. Escrow Ledger pairs enterprise cloud encryption with instant offline JSON backup capabilities.',
      points: [
        'AES encrypted database connection powered by Supabase',
        'Instant one-click offline JSON ledger snapshot downloads',
        'Secure multi-admin access control and authentication',
        'Self-healing database reconnect and automatic session recovery'
      ],
      stats: '256-Bit Encrypted Architecture'
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Set Up Parties & Commission',
      desc: 'Register client and vendor accounts with custom opening balances, contact info, and tailored commission rates.',
      icon: <Users className="w-6 h-6 text-blue-500" />
    },
    {
      num: '02',
      title: 'Record High-Speed Entries',
      desc: 'Input debits, credits, or transfers. Double-entry validation immediately balances amounts and logs commissions.',
      icon: <RefreshCw className="w-6 h-6 text-emerald-500" />
    },
    {
      num: '03',
      title: 'Export Audit-Ready Reports',
      desc: 'Generate real-time Balance Sheets, P&L statements, and party summaries ready for clients, audits, and taxation.',
      icon: <FileText className="w-6 h-6 text-indigo-500" />
    }
  ];

  const faqs = [
    {
      q: 'How does double-entry verification work in Escrow Ledger?',
      a: 'Whenever you post an escrow or ledger transaction, the system requires equal debit and credit distributions. If amounts do not reconcile to zero difference, the entry is held, ensuring that ledger books remain mathematically balanced at all times.'
    },
    {
      q: 'Can I set different commission rates for different clients or brokers?',
      a: 'Yes! Every party profile allows you to configure a dedicated default commission percentage. When recording a transaction for that party, the commission is automatically computed while still allowing manual override if needed.'
    },
    {
      q: 'Is my ledger data safe and can I back it up locally?',
      a: 'Absolutely. In addition to continuous encrypted cloud storage, Escrow Ledger features a built-in one-click backup mechanism that downloads your entire ledger dataset into a secure JSON snapshot to your local device anytime.'
    },
    {
      q: 'What financial reports are available?',
      a: 'Escrow Ledger provides comprehensive real-time financial reporting including Balance Sheets, Profit & Loss Reports, Party Ledger Summaries with running balances, and high-frequency Transaction Feeds with custom date filters.'
    },
    {
      q: 'Is the platform mobile-friendly and accessible on tablets?',
      a: 'Yes. The entire user interface is fully responsive, featuring a modern mobile navigation dock and dark mode support, allowing you to review balances and enter transactions from anywhere.'
    }
  ];

  return (
    <div className="w-full flex-grow flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 selection:bg-blue-500 selection:text-white">
      
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-4 overflow-hidden bg-slate-900 text-white">
        {/* Ambient Gradient Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.22),rgba(255,255,255,0))] pointer-events-none" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold text-xs mb-8 uppercase tracking-wider backdrop-blur-md animate-fade-in shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Next-Gen Double-Entry Escrow Ledger</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.08]">
            Precision Accounting for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              High-Speed Escrow.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            Effortlessly manage multi-party escrow accounts, eliminate manual math with real-time balance calculations, automate commissions, and generate audit-ready financial statements in seconds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-xl shadow-blue-600/25 active:scale-[0.98] group"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#preview"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base rounded-2xl transition-all duration-200 border border-slate-700/80 hover:border-slate-600 active:scale-[0.98] backdrop-blur-sm flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Explore Live Demo
            </a>
          </div>

          {/* Trust Value Badges */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Double-Entry Balance Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>AES-256 Encrypted Cloud Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Sub-millisecond Real-Time Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS IMPACT BAR */}
      <section className="bg-slate-900/95 border-y border-slate-800 text-white py-10 px-4 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mb-1">
              ₹50 Cr+
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Ledger Flow Managed
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-1">
              99.99%
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Reconciliation Accuracy
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mb-1">
              0.00 ms
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Zero-Math Instant Calc
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mb-1">
              1-Click
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Audit Statements
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE LIVE LEDGER PREVIEW (MOCKUP UI) */}
      <section id="preview" className="py-20 md:py-28 px-4 bg-slate-100 dark:bg-slate-900/60 relative overflow-hidden transition-colors">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Activity className="w-3.5 h-3.5" /> Interactive UI Preview
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Experience the Power of Live Balancing
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-base">
              Explore how transactions, auto-commissions, and debit-credit parity operate in real-time.
            </p>
          </div>

          {/* Interactive Mockup Window */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
            {/* Window Title Bar */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs font-mono font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                  escrow-ledger-live-environment // v2.4
                </span>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Double-Entry Balanced: ₹ 0.00 Discrepancy
              </div>
            </div>

            {/* Dashboard Quick Stats inside Mockup */}
            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Escrow Vault</span>
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    ₹ 42,85,900
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" /> +12.4% this cycle
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Commission Earned</span>
                    <Calculator className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    ₹ 1,48,250
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1 block">
                    Auto-credited to profit
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Parties</span>
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    158
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1 block">
                    All accounts reconciled
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Math Engine</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    0.00 ms
                  </div>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 block">
                    Zero latency sync
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Pills inside Mockup */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" /> Filter Demo:
                </span>
                {(['all', 'escrow', 'commission', 'transfer'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setDemoFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      demoFilter === filterKey
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredTransactions.length} of {demoTransactions.length} sample records
              </span>
            </div>

            {/* Mockup Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-6">Voucher #</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Party Ledger</th>
                    <th className="py-3 px-6">Classification</th>
                    <th className="py-3 px-6 text-right">Debit (Dr)</th>
                    <th className="py-3 px-6 text-right">Credit (Cr)</th>
                    <th className="py-3 px-6 text-center">Comm. Rate</th>
                    <th className="py-3 px-6 text-center">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">
                        {tx.id}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                        {tx.date}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        {tx.party}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {tx.debit}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {tx.credit}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {tx.commission}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mockup Footer Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span>Total Debit: <strong className="text-slate-900 dark:text-white">₹ 4,30,000</strong></span>
                <span>Total Credit: <strong className="text-slate-900 dark:text-white">₹ 4,30,000</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Difference: ₹ 0.00 ✓</span>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                Launch In Your Account
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="py-24 px-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-4 border border-blue-500/20">
              <Layers className="w-3.5 h-3.5" /> Powerful Ledger Capabilities
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for Modern Financial Precision
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 text-lg leading-relaxed">
              Every detail is architected to eliminate bookkeeping friction, protect escrow balances, and deliver audit-grade reporting.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((f, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700/60 shadow-sm group-hover:scale-105 transition-transform">
                      {f.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {f.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEEP DIVE TABS */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-4 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Deep Feature Tour
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Built for Scale and Total Control
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 text-base">
              Select an architectural module below to see how Escrow Ledger operates under the hood.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
            {[
              { id: 'double-entry', label: 'Double-Entry Integrity', icon: <Layers className="w-4 h-4" /> },
              { id: 'commissions', label: 'Commission Automation', icon: <Calculator className="w-4 h-4" /> },
              { id: 'reports', label: 'Financial Statements', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'security', label: 'Security & Backup', icon: <ShieldCheck className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Content Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {deepDiveTabs[activeTab].badge}
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                {deepDiveTabs[activeTab].title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                {deepDiveTabs[activeTab].desc}
              </p>

              <div className="space-y-3 pt-2">
                {deepDiveTabs[activeTab].points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Callout on the right */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl border border-slate-700/60 shadow-inner flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-2">Verified Architecture</h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Engineered with zero compromises on ledger reliability and financial correctness.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-700/80">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Benchmark Standard</p>
                <p className="text-lg font-black text-emerald-400 mt-1">
                  {deepDiveTabs[activeTab].stats}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - 3 STEP WORKFLOW */}
      <section className="py-24 px-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4 border border-indigo-500/20">
              <RefreshCw className="w-3.5 h-3.5" /> Simple 3-Step Setup
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Get Started in Minutes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 text-base">
              No steep learning curve. Start organizing your client accounts and posting transactions immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 relative hover:border-blue-500/40 transition-all hover:-translate-y-1"
              >
                <div className="text-5xl font-black text-slate-200 dark:text-slate-800 mb-6 font-mono">
                  {st.num}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm mb-5">
                  {st.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {st.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-4 border border-blue-500/20">
              <HelpCircle className="w-3.5 h-3.5" /> Got Questions?
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-4 text-base">
              Everything you need to know about double-entry accounting, party ledgers, and data security.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-200 shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL HIGH-IMPACT CALL TO ACTION */}
      <section className="py-24 px-4 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(37,99,235,0.2),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold text-xs mb-8 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Start Reconciling With Confidence
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            Ready to Take Complete Control of Your Ledgers?
          </h2>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate reconciliation headaches, automate client commission shares, and manage your escrow accounts with bank-grade integrity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-9 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98] group"
            >
              Open Your Ledger Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="mailto:escrow.bms@gmail.com?subject=Escrow%20Ledger%20Inquiry"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-base rounded-2xl transition-all border border-slate-700 active:scale-[0.98]"
            >
              Contact Specialist
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Landing;
