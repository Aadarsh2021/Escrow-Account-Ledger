import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, AlertTriangle, LogOut, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGateProps {
  children: JSX.Element;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // If no user, or profile is not fetched yet, pass through (ProtectedRoute handles auth redirection)
  if (!user) {
    return children;
  }

  // Allow a short buffer or if profile hasn't loaded yet
  if (!profile) {
    return children;
  }

  const isBlocked = profile.is_blocked === true;
  
  // Calculate expiration
  const hasExpired = (() => {
    if (profile.subscription_expires_at) {
      const expiry = new Date(profile.subscription_expires_at);
      return expiry.getTime() < Date.now();
    }
    return false;
  })();

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const plans = [
    {
      name: 'Trial Plan',
      price: '₹ 0',
      period: '30 Days',
      desc: 'Free evaluation package for new business profiles.',
      features: ['All Core Ledgers', 'Double-Entry Integrity', 'Parallel Report Querying', 'Autocomplete Autocompletion'],
      highlighted: false,
      buttonText: 'Trial Period Active'
    },
    {
      name: 'Professional',
      price: '₹ 1,499',
      period: 'Month',
      desc: 'Premium platform features for active business entities.',
      features: ['Unlimited Accounts & Ledgers', 'Automated Commission Rates', 'Real-Time Audit Feeds', '0ms Rapid Load Speed', 'Standard Email & Call Support'],
      highlighted: true,
      buttonText: 'Select Pro Plan'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'Year',
      desc: 'SaaS ledger database capabilities for high-frequency operations.',
      features: ['Dedicated Supabase DB Cluster', 'Multi-Admin Controls', 'Custom Database Query Tuning', '24/7 Dedicated Account Rep', 'Custom API Hookups'],
      highlighted: false,
      buttonText: 'Contact HQ Support'
    }
  ];

  // 1. Handle Suspended Profile State
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(239,68,68,0.1),transparent)] pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-2xl text-center relative z-10 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-white mb-3 tracking-tight">Account Suspended</h1>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            Your business profile has been locked or suspended by the platform administrator due to policy compliance or account verification requirements.
          </p>

          <div className="bg-red-950/20 border border-red-500/10 rounded-2xl p-4 mb-8 text-left">
            <div className="flex gap-3 text-red-400 items-start">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block mb-1 text-red-300">Access Denied</span>
                Please contact the platform administrator at <strong className="text-white">escrow.bms@gmail.com</strong> to reactivate your workspace profile and unlock your transactions database.
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all border border-slate-700 active:scale-[0.98]"
          >
            <LogOut className="w-4.5 h-4.5" /> Sign Out from Profile
          </button>
        </div>
      </div>
    );
  }

  // 2. Handle Expired Subscription State
  if (hasExpired) {
    return (
      <div className="min-h-screen bg-slate-950 py-16 px-4 md:px-8 relative overflow-hidden flex flex-col justify-center items-center">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.08),transparent)] pointer-events-none"></div>
        <div className="absolute top-20 left-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl w-full relative z-10">
          {/* Header Banner */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-xs mb-6 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" /> Action Required: Subscription Expired
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
              Access Lock: Plan Renewal Needed
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              Your active trial or subscription plan ended on <strong className="text-amber-400">{formatExpiryDate(profile.subscription_expires_at)}</strong>. 
              To unlock your transactions, parties directory, and accounts ledger, please activate a plan below.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 items-stretch">
            {plans.map((p, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col justify-between rounded-3xl border p-8 transition-all duration-300 relative ${
                  p.highlighted 
                    ? 'bg-slate-900/60 backdrop-blur-xl border-blue-500/40 shadow-xl shadow-blue-500/5 hover:-translate-y-1' 
                    : 'bg-slate-900/30 backdrop-blur-md border-slate-800 hover:border-slate-700 hover:bg-slate-900/45 hover:-translate-y-1'
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-2">{p.name}</div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-white tracking-tight">{p.price}</span>
                    <span className="text-slate-500 text-sm font-semibold">/ {p.period}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 border-b border-slate-800/80 pb-6">{p.desc}</p>

                  <ul className="space-y-4 mb-8">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex gap-3 text-slate-300 text-sm">
                        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${p.highlighted ? 'text-blue-500' : 'text-slate-500'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  disabled={idx === 0} // Disable trial tier since it's already expired
                  className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    idx === 0 
                      ? 'bg-slate-800/50 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : p.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-[0.98]'
                  }`}
                >
                  {p.buttonText}
                  {idx > 0 && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 border-t border-slate-900">
            <p className="text-slate-500 text-sm text-center">
              Payment systems are processed securely. Need help? Contact <strong className="text-slate-300">escrow.bms@gmail.com</strong>
            </p>
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white font-semibold flex items-center gap-2 text-sm transition-all active:scale-[0.97]"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Subscription is Active - render children pages
  return children;
};
