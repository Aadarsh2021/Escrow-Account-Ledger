import { Users, Activity, Cpu, Database } from 'lucide-react';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_invoices: number;
  total_clients: number;
}

interface AdminOverviewProps {
  stats: AdminStats;
  loading: boolean;
  maintenanceMode: boolean;
  publicSignups: boolean;
  setActiveTab: (tab: 'overview' | 'users' | 'system') => void;
}

export const AdminOverview = ({
  stats,
  loading,
  maintenanceMode,
  publicSignups,
  setActiveTab
}: AdminOverviewProps) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Registered Entities', value: stats.total_users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: <Users className="w-6 h-6 text-blue-600" /> },
          { label: 'Active (30d)', value: stats.active_users, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <Activity className="w-6 h-6 text-emerald-600" /> },
          { label: 'Total Parties', value: stats.total_clients, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', icon: <Cpu className="w-6 h-6 text-indigo-600" /> },
          { label: 'Total Transactions', value: stats.total_invoices, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: <Database className="w-6 h-6 text-amber-600" /> },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-3xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
              <p className={`text-3xl font-black ${card.color} tracking-tight`}>
                {loading ? '...' : card.value}
              </p>
            </div>
            <div className={`p-4 rounded-2xl ${card.bg} border shrink-0 transition-transform group-hover:scale-110`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Platform Health Monitor</h3>
              <p className="text-slate-500 text-xs font-semibold">Real-time status indicators</p>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE & HEALTHY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'API Latency', value: '45ms', desc: 'Optimal server transit', icon: <Activity className="w-5 h-5 text-blue-600" /> },
              { label: 'DB Connections', value: '14/100', desc: 'Active session pool', icon: <Database className="w-5 h-5 text-emerald-600" /> },
              { label: 'Infrastructure CPU', value: '6%', desc: 'Platform load metrics', icon: <Cpu className="w-5 h-5 text-amber-600" /> },
            ].map((comp, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                    {comp.icon}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">Optimal</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{comp.label}</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{comp.value}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{comp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance / Quick Settings summary */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Active Infrastructure Guards</h3>
              <p className="text-slate-500 text-xs font-semibold">Quick dashboard guard overview</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${maintenanceMode ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  <span className="text-xs font-bold text-slate-700">Maintenance Mode</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${maintenanceMode ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-200/60 text-slate-500 border border-slate-300/40'}`}>
                  {maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${publicSignups ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-xs font-bold text-slate-700">Public Registrations</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${publicSignups ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                  {publicSignups ? 'OPEN' : 'LOCKED'}
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('system')}
            className="w-full mt-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold rounded-xl border border-slate-200 transition-all text-xs text-center shadow-sm"
          >
            Configure Guards
          </button>
        </div>
      </div>
    </div>
  );
};
