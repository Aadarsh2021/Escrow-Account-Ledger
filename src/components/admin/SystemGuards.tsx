import { ShieldCheck, Megaphone, RefreshCw, Activity } from 'lucide-react';

export interface AuditLog {
  id: string;
  action_type: string;
  target_id: string | null;
  admin_email: string;
  created_at: string;
}

interface SystemGuardsProps {
  maintenanceMode: boolean;
  publicSignups: boolean;
  broadcastMessage: string;
  setBroadcastMessage: (val: string) => void;
  isBroadcastPublishing: boolean;
  handlePublishBroadcast: () => Promise<void>;
  setIsMaintenanceOpen: (open: boolean) => void;
  setIsSignupsOpen: (open: boolean) => void;
  auditLogs: AuditLog[];
  formatDateTime: (dateStr: string | null) => string;
}

export const SystemGuards = ({
  maintenanceMode,
  publicSignups,
  broadcastMessage,
  setBroadcastMessage,
  isBroadcastPublishing,
  handlePublishBroadcast,
  setIsMaintenanceOpen,
  setIsSignupsOpen,
  auditLogs,
  formatDateTime
}: SystemGuardsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Platform Settings & Controls */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Security & Guard Protocols
            </h3>
            <p className="text-slate-500 text-xs font-semibold">Control register constraints and routing boundaries</p>
          </div>

          <div className="space-y-4">
            {/* Maintenance toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">Platform Maintenance Mode</p>
                <p className="text-slate-400 text-[10px] font-bold leading-relaxed max-w-md">
                  Enabling this blocks dashboard access for all business profiles and redirects them to a maintenance notice.
                </p>
              </div>
              
              <button
                onClick={() => setIsMaintenanceOpen(true)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  maintenanceMode ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Public signups toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">Public Registrations Gate</p>
                <p className="text-slate-400 text-[10px] font-bold leading-relaxed max-w-md">
                  Enables or disables signups for new business entities. If locked, new profiles cannot be registered.
                </p>
              </div>

              <button
                onClick={() => setIsSignupsOpen(true)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  publicSignups ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    publicSignups ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Announcements broadcast panel */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -bottom-6 -right-6 text-slate-100 pointer-events-none">
            <Megaphone className="w-28 h-28" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600 animate-bounce" />
              <div>
                <h3 className="text-base font-black text-slate-900">Global Broadcast Notice</h3>
                <p className="text-slate-500 text-xs font-semibold">Publish dynamic banner announcements across logged-in profiles</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <textarea
                placeholder="Type a notice to broadcast to all clients (e.g. 'Server maintenance scheduled for Sunday midnight...')"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full min-h-24 p-4 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none resize-none"
              />

              <button
                onClick={handlePublishBroadcast}
                disabled={isBroadcastPublishing}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isBroadcastPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Publishing notice...
                  </>
                ) : (
                  "Publish Notice to Dashboard Banners"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Trail */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6 h-fit">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Audit Trail
          </h3>
          <p className="text-slate-500 text-xs font-semibold">Real-time administrator security event logging</p>
        </div>

        <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="text-center py-10">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-bold">No administrative actions logged yet</p>
            </div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-extrabold uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                    {log.action_type}
                  </span>
                  <span className="text-slate-400 font-semibold">{formatDateTime(log.created_at)}</span>
                </div>
                
                {log.target_id && (
                  <p className="text-[10px] text-slate-600 font-bold font-mono bg-slate-100 px-2 py-1 rounded break-all">
                    Target: {log.target_id}
                  </p>
                )}

                <p className="text-[10px] text-slate-400 font-bold italic">
                  By admin: {log.admin_email}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
