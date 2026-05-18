import { ShieldCheck, Zap, Lock, BookOpen, Check, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Secure Ledger Management',
      desc: 'Keep track of all your debit and credit transactions with enterprise-grade security and accuracy.',
      icon: <Lock className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'Real-time Calculations',
      desc: 'No more manual math. Get instant balances and commission reports synced in real-time.',
      icon: <Zap className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'Party Organizations',
      desc: 'Create and manage individual accounts for all your clients, vendors, and business partners easily.',
      icon: <BookOpen className="w-6 h-6 text-blue-600" />
    }
  ];

  const plans = [
    {
      name: 'Trial Plan',
      price: '₹ 0',
      period: '30 Days',
      desc: 'Free evaluation package for new business profiles. Perfect to test our features.',
      features: ['All Core Ledgers', 'Double-Entry Integrity', 'Parallel Report Querying', 'Autocomplete Suggestions'],
      highlighted: false,
      buttonText: 'Start 30-Day Trial',
      action: () => navigate('/auth')
    },
    {
      name: 'Professional',
      price: '₹ 1,499',
      period: 'month',
      desc: 'Premium ledger features for active, growing business entities.',
      features: ['Unlimited Accounts & Ledgers', 'Automated Commission Rates', 'Real-Time Audit Feeds', '0ms Rapid Load Speed', 'Standard Email & Call Support'],
      highlighted: true,
      buttonText: 'Upgrade to Professional',
      action: () => navigate('/auth')
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'year',
      desc: 'SaaS ledger database capabilities for high-frequency operations.',
      features: ['Dedicated Supabase DB Cluster', 'Multi-Admin Controls', 'Custom Database Query Tuning', '24/7 Dedicated Account Rep', 'Custom API Hookups'],
      highlighted: false,
      buttonText: 'Contact Enterprise Sales',
      action: () => window.location.href = 'mailto:escrow.bms@gmail.com?subject=Enterprise Inquiry'
    }
  ];

  return (
    <div className="w-full flex-grow flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Hero Section */}
      <section className="bg-slate-900 dark:bg-slate-950 text-white pt-28 pb-36 px-4 relative overflow-hidden transition-colors duration-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.15),transparent)] pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 font-semibold text-xs mb-8 uppercase tracking-wider animate-pulse">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> Premium Ledger Ecosystem
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-tight">
            Manage your accounts with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-emerald-400">absolute confidence.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            The ultimate double-entry accounting ledger designed specifically for high-speed escrow and commission management. Track client balances, automate rates, and deploy in 0ms.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/auth')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-900/30 active:scale-[0.98] group"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#pricing"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-2xl transition-all border border-slate-700 active:scale-[0.98]"
            >
              View Pricing Tiers
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-slate-900 px-4 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Why choose Escrow Ledger?</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg">Engineered for real-time ledger management and zero-math automation.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-900/30">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 bg-slate-900 text-white px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent)] pointer-events-none"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold text-xs uppercase tracking-wider mb-4">
              <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" /> Flexible Pricing Options
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
              Choose the perfect plan for your business
            </h2>
            <p className="text-slate-400">
              Sign up today and get an instant 30-day free trial. No credit card required. Upgrade or change plans anytime.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
            {plans.map((p, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col justify-between rounded-3xl border p-8 transition-all duration-300 relative ${
                  p.highlighted 
                    ? 'bg-slate-800/80 backdrop-blur-xl border-blue-500/50 shadow-2xl shadow-blue-500/10 hover:-translate-y-1' 
                    : 'bg-slate-800/30 backdrop-blur-md border-slate-850 hover:border-slate-750 hover:-translate-y-1'
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-slate-400 font-extrabold text-sm uppercase tracking-wider mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-white tracking-tight">{p.price}</span>
                    <span className="text-slate-500 text-sm font-semibold">/ {p.period}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 border-b border-slate-800 pb-6">{p.desc}</p>

                  <ul className="space-y-4 mb-8">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex gap-3 text-slate-300 text-sm items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${p.highlighted ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700/30 text-slate-400'}`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={p.action}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    p.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/35'
                      : 'bg-slate-800 hover:bg-slate-750 text-white border border-slate-700'
                  }`}
                >
                  {p.buttonText}
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
