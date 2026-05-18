import { useState, useEffect } from 'react';
import { Settings, PlusCircle, Database, BarChart3, TrendingUp, Users, Activity, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GlobalLoader } from '../components/ui/GlobalLoader';
const Dashboard = () => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('cached_dashboard_company') || '';
  });
  
  const [statsData, setStatsData] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_dashboard_stats');
      return cached ? JSON.parse(cached) : {
        totalParties: 0,
        todayEntries: 0,
        overallBalance: 0,
        todayVolume: 0,
        totalCommission: 0,
        pendingFinals: 0
      };
    } catch {
      return {
        totalParties: 0,
        todayEntries: 0,
        overallBalance: 0,
        todayVolume: 0,
        totalCommission: 0,
        pendingFinals: 0
      };
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_dashboard_stats');
      return !cached;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let mounted = true;
    
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch all 4 distinct datasets in parallel to optimize initial reload load time!
        const [profileRes, partiesRes, todayTnsRes, allTnsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('id', user.id)
            .single(),
          supabase
            .from('parties')
            .select('id, monday_final, system_type')
            .eq('user_id', user.id),
          supabase
            .from('transactions')
            .select('credit, debit, transaction_date')
            .eq('user_id', user.id)
            .gte('transaction_date', today.toISOString()),
          supabase
            .from('transactions')
            .select('party_id, balance, transaction_date, parties(system_type)')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })
        ]);

        if (profileRes.error) throw profileRes.error;
        if (partiesRes.error) throw partiesRes.error;
        if (todayTnsRes.error) throw todayTnsRes.error;
        if (allTnsRes.error) throw allTnsRes.error;

        const profileData = profileRes.data;
        const partiesData = partiesRes.data;
        const todayTns = todayTnsRes.data;
        const allTns = allTnsRes.data;

        if (mounted && profileData) {
          const name = profileData.company_name || profileData.full_name || user.user_metadata?.full_name || 'Valued User';
          setCompanyName(name);
          try {
            localStorage.setItem('cached_dashboard_company', name);
          } catch {}
        }

        const totalParties = partiesData?.length || 0;
        const pendingFinals = partiesData?.filter(p => p.monday_final !== true && p.monday_final !== 'true' && p.system_type === 'normal').length || 0;

        const todayEntries = todayTns?.length || 0;
        const todayVolume = todayTns?.reduce((sum, t) => sum + Math.max(t.credit, t.debit), 0) || 0;

        // Calculate Commission (Balance of the commission system party)
        const commissionParty = allTns?.find((t: any) => t.parties?.system_type === 'commission');
        const totalCommission = commissionParty ? commissionParty.balance : 0;

        // Calculate Overall Balance
        const latestBalances = new Map();
        allTns?.forEach(t => {
          if (!latestBalances.has(t.party_id)) {
            latestBalances.set(t.party_id, t.balance);
          }
        });

        let totalBalance = 0;
        latestBalances.forEach(bal => totalBalance += bal);

        if (mounted) {
          const newStats = {
            totalParties,
            todayEntries,
            overallBalance: totalBalance,
            todayVolume,
            totalCommission,
            pendingFinals
          };
          setStatsData(newStats);
          try {
            localStorage.setItem('cached_dashboard_stats', JSON.stringify(newStats));
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboardData();

    // Subscribe to real-time changes for automatic dashboard updates
    const dashboardChannel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `user_id=eq.${user.id}` }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => { 
      mounted = false; 
      supabase.removeChannel(dashboardChannel);
    };
  }, [user]);



  const stats = [
    { name: 'Total Parties', value: statsData.totalParties.toString(), icon: <Users className="w-5 h-5" />, color: 'blue' },
    { name: 'Today Entries', value: statsData.todayEntries.toString(), icon: <Activity className="w-5 h-5" />, color: 'green' },
    { 
      name: 'Overall Balance', 
      value: `₹ ${Math.abs(statsData.overallBalance).toLocaleString()} ${statsData.overallBalance >= 0 ? 'Cr' : 'Dr'}`, 
      icon: <TrendingUp className="w-5 h-5" />, 
      color: statsData.overallBalance >= 0 ? 'emerald' : 'rose' 
    },
    { name: "Today's Volume", value: `₹ ${statsData.todayVolume.toLocaleString()}`, icon: <Database className="w-5 h-5" />, color: 'orange' },
    { name: 'Total Commission', value: `₹ ${Math.abs(statsData.totalCommission).toLocaleString()}`, icon: <BarChart3 className="w-5 h-5" />, color: 'indigo' },
    { name: 'Pending Finals', value: statsData.pendingFinals.toString(), icon: <AlertCircle className="w-5 h-5" />, color: 'amber' },
  ];

  const quickActions = [
    { name: 'Configure Settings', desc: 'Setup your business profile & preferences', icon: <Settings />, link: '/configure/company' },
    { name: 'Create New Party', desc: 'Add new clients or business partners', icon: <PlusCircle />, link: '/create/party' },
    { name: 'Data Entry', desc: 'Record daily credit/debit transactions', icon: <Database />, link: '/ledger' },
    { name: 'View Reports', desc: 'Check balances and transaction history', icon: <BarChart3 />, link: '/reports/parties' },
  ];

  if (loading) {
    return <GlobalLoader fullScreen={false} />;
  }

  return (
    <div className="w-full pb-20 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-12 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome, <span className="text-blue-600 dark:text-blue-400">{companyName}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Here's an overview of your escrow accounts today.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 transition-all hover:shadow-lg dark:hover:shadow-blue-500/5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 
                stat.color === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' : 
                stat.color === 'orange' ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400' :
                stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' :
                stat.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' :
                'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
              }`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <div 
              key={action.name} 
              onClick={() => window.location.href = action.link}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:shadow-2xl dark:hover:shadow-blue-500/5 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10 dark:opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform text-slate-400 dark:text-slate-500">
                {action.icon}
              </div>
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                {action.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{action.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">{action.desc}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity Placeholder (Could be expanded later) */}
        <div className="mt-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-200">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-900 dark:text-white">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <button 
              onClick={() => window.location.href = '/ledger'}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Ledger
            </button>
          </div>
          <div className="p-8 text-center py-20 text-slate-400 dark:text-slate-500 italic">
            Check your ledger for the most up-to-date transaction history.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
