import { 
  Info, Copy, ShieldCheck, Key, 
  AlertTriangle, Clock 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface AdminUser {
  user_id: string;
  company_name: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  subscription_expires_at: string | null;
  plan_type: string;
  is_blocked: boolean;
  is_paid: boolean;
  client_count: number;
  invoice_count: number;
  last_invoice_created_at: string | null;
}

interface AdminModalsProps {
  selectedUser: AdminUser | null;
  actionLoading: boolean;
  
  // Details Modal
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  editPlanType: string;
  setEditPlanType: (val: string) => void;
  editIsPaid: boolean;
  setEditIsPaid: (val: boolean) => void;
  handleUpdateUserPlan: () => Promise<void>;
  
  // Reset Password Modal
  isResetOpen: boolean;
  setIsResetOpen: (open: boolean) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  handleResetPassword: () => Promise<void>;
  
  // Extend subscription Modal
  isExtendOpen: boolean;
  setIsExtendOpen: (open: boolean) => void;
  extensionDays: string;
  setExtensionDays: (val: string) => void;
  handleExtendPlan: () => Promise<void>;
  
  // Block Modal
  isBlockOpen: boolean;
  setIsBlockOpen: (open: boolean) => void;
  handleToggleBlock: () => Promise<void>;
  
  // Delete Modal
  isDeleteOpen: boolean;
  setIsDeleteOpen: (open: boolean) => void;
  handleDeleteUser: () => Promise<void>;
  
  // Maintenance Modal
  isMaintenanceOpen: boolean;
  setIsMaintenanceOpen: (open: boolean) => void;
  maintenanceMode: boolean;
  toggleMaintenanceSetting: () => void;
  
  // Signups Modal
  isSignupsOpen: boolean;
  setIsSignupsOpen: (open: boolean) => void;
  publicSignups: boolean;
  togglePublicSignupsSetting: () => void;
}

// Simple Sparkles decoration
const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor"/>
  </svg>
);

export const AdminModals = ({
  selectedUser,
  actionLoading,
  isDetailsOpen,
  setIsDetailsOpen,
  editPlanType,
  setEditPlanType,
  editIsPaid,
  setEditIsPaid,
  handleUpdateUserPlan,
  isResetOpen,
  setIsResetOpen,
  newPassword,
  setNewPassword,
  handleResetPassword,
  isExtendOpen,
  setIsExtendOpen,
  extensionDays,
  setExtensionDays,
  handleExtendPlan,
  isBlockOpen,
  setIsBlockOpen,
  handleToggleBlock,
  isDeleteOpen,
  setIsDeleteOpen,
  handleDeleteUser,
  isMaintenanceOpen,
  setIsMaintenanceOpen,
  maintenanceMode,
  toggleMaintenanceSetting,
  isSignupsOpen,
  setIsSignupsOpen,
  publicSignups,
  togglePublicSignupsSetting
}: AdminModalsProps) => {

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getSubscriptionTimeRemaining = (expiryStr: string | null) => {
    if (!expiryStr) return { text: 'No active plan', isLow: true, isExpired: true };
    const expiry = new Date(expiryStr);
    const diff = expiry.getTime() - Date.now();
    if (diff <= 0) return { text: 'Expired', isLow: true, isExpired: true };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h left`;
    } else {
      text = `${hours}h left`;
    }
    
    return {
      days,
      hours,
      text,
      isLow: days < 7,
      isExpired: false
    };
  };

  return (
    <>
      {/* Modal 1: Analysis Details */}
      {isDetailsOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Info className="w-5 h-5 text-blue-600" />
              Entity Analytics & Details
            </h3>

            <div className="py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200/60">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Name</p>
                    <p className="font-bold text-lg text-slate-900">{selectedUser.company_name || 'Individual Profile'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered UID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded font-mono text-slate-700 break-all select-all shadow-sm">
                        {selectedUser.user_id}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedUser.user_id);
                          toast.success("UID copied!");
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Account</p>
                    <p className="text-sm font-bold text-slate-700">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workspace Database Metrics</p>
                    <p className="text-xs font-bold text-slate-600">
                      Has created <span className="text-slate-900 font-extrabold">{selectedUser.client_count}</span> parties & <span className="text-slate-900 font-extrabold">{selectedUser.invoice_count}</span> transactions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Access detail card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ledger subscription Protocol</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedUser.is_blocked 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {selectedUser.is_blocked ? 'SUSPENDED' : 'ACTIVE HEALTH'}
                  </span>
                </div>

                <div className="space-y-1 relative z-10">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    {selectedUser.subscription_expires_at ? 'Paid Premium' : 'Free Trial Tier'}
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    {selectedUser.subscription_expires_at 
                      ? `Access period valid through ${formatDateTime(selectedUser.subscription_expires_at)}` 
                      : 'No explicit limits. Manage settings from operational limit overlay.'}
                  </p>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 mt-2">
                    Time Remaining: {' '}
                    {(() => {
                      const remaining = getSubscriptionTimeRemaining(selectedUser.subscription_expires_at);
                      if (remaining.isExpired) {
                        return <span className="text-rose-500 font-extrabold">{remaining.text}</span>;
                      }
                      if (remaining.isLow) {
                        return <span className="text-amber-500 font-extrabold animate-pulse">{remaining.text}</span>;
                      }
                      return <span className="text-emerald-600 font-extrabold">{remaining.text}</span>;
                    })()}
                  </p>
                </div>
              </div>

              {/* Plan Management Form */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200/60 pb-2">
                  <Key className="w-4 h-4 text-blue-600" />
                  Manage Plan Permissions
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Subscription Tier</label>
                    <select
                      value={editPlanType}
                      onChange={(e) => setEditPlanType(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:border-blue-600 focus:outline-none cursor-pointer"
                    >
                      <option value="trial">Trial Plan (30 Days)</option>
                      <option value="monthly">Professional (Monthly)</option>
                      <option value="yearly">Professional (Yearly)</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Payment Status</label>
                    <select
                      value={editIsPaid ? 'true' : 'false'}
                      onChange={(e) => setEditIsPaid(e.target.value === 'true')}
                      className="w-full h-11 px-3 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl focus:border-blue-600 focus:outline-none cursor-pointer"
                    >
                      <option value="false">Unpaid / Inactive</option>
                      <option value="true">Paid / Active</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleUpdateUserPlan}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    {actionLoading ? 'Saving...' : 'Save Plan Changes'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Close analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Reset Password */}
      {isResetOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900">Forced Credential Overwrite</h3>
              <p className="text-slate-500 text-xs font-semibold mt-1">Assign a temporary security passkey for {selectedUser.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">New Temporary Password</label>
              <input
                type="text"
                placeholder="e.g. TempPass123!"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl placeholder:text-slate-450 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                Notice: Setting this will immediately modify their backend password credentials. Provide them this code to sign back in.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Abort Action
              </button>
              <button
                disabled={!newPassword || actionLoading}
                onClick={handleResetPassword}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all"
              >
                {actionLoading ? 'Saving...' : 'Overwrite password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Extend Subscription */}
      {isExtendOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Update Access Duration
              </h3>
              <p className="text-slate-500 text-xs font-semibold mt-1">Configure additional free operational access limits for {selectedUser.email}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Quick Presets</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '-30d', val: '-30', style: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-100' },
                    { label: '-7d', val: '-7', style: 'text-rose-500 bg-rose-50 hover:bg-rose-100 border-rose-100' },
                    { label: '+7d', val: '7', style: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
                    { label: '+30d', val: '30', style: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
                    { label: '+365d', val: '365', style: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setExtensionDays(preset.val)}
                      className={`h-9 font-black text-[10px] rounded-xl border flex items-center justify-center transition-all ${
                        extensionDays === preset.val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : preset.style
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Custom Extension (Days)</label>
                <input
                  type="number"
                  placeholder="Enter days..."
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl placeholder:text-slate-455 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Warning/indicator alert */}
              <div className={`p-4 rounded-xl border text-[11px] font-bold leading-relaxed flex items-center gap-3 ${
                parseInt(extensionDays) < 0 
                  ? 'bg-rose-50 border-rose-100 text-rose-600' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                <div className={`p-1.5 rounded-full shrink-0 ${
                  parseInt(extensionDays) < 0 ? 'bg-rose-100' : 'bg-emerald-100'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <p>
                  This action will {parseInt(extensionDays) < 0 ? 'deduct' : 'extend'} the organization's subscription expires parameter by <span className="underline">{Math.abs(parseInt(extensionDays))} days</span>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsExtendOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Abort Action
              </button>
              <button
                disabled={!extensionDays || actionLoading}
                onClick={handleExtendPlan}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all"
              >
                {actionLoading ? 'Updating...' : 'Commit access change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Confirm Suspension Block */}
      {isBlockOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  {selectedUser.is_blocked ? 'Unblock' : 'Suspend'} Client Account?
                </h3>
                <p className="text-slate-500 text-xs font-semibold">
                  {selectedUser.is_blocked 
                    ? `Restoring dashboard access for ${selectedUser.company_name || 'this entity'}. They will be able to log back in immediately.` 
                    : `Temporarily suspending workspace access for ${selectedUser.company_name || 'this entity'}. They will be logged out and cannot sign in until unblocked.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsBlockOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Cancel request
              </button>
              <button
                disabled={actionLoading}
                onClick={handleToggleBlock}
                className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-lg transition-all ${
                  selectedUser.is_blocked 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 hover:shadow-emerald-600/20' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10 hover:shadow-rose-600/20'
                }`}
              >
                {actionLoading ? 'Saving...' : selectedUser.is_blocked ? 'Restore Access' : 'Restrict Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Purge Workspace Delete */}
      {isDeleteOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-900">
                  Purge User Profile Dataset?
                </h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  This will destroy all related ledger data (including parties, transaction rows, and settings) for <span className="text-slate-900 font-extrabold underline">{selectedUser.company_name || 'this entity'}</span>.
                </p>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-[10px] font-bold text-amber-700 leading-normal flex gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  Note: The credential account remains inside Supabase Auth. To revoke core identity logins entirely, delete them from the Supabase admin panel.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Abort operation
              </button>
              <button
                disabled={actionLoading}
                onClick={handleDeleteUser}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 active:scale-[0.98] transition-all"
              >
                {actionLoading ? 'Purging Workspace...' : 'Purge Data Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Maintenance mode confirmation */}
      {isMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Critical Operations Guard</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  {maintenanceMode 
                    ? "Disabling maintenance mode will restore platform dashboard access for all entities immediately." 
                    : "Enabling maintenance mode will completely lock the application for non-admin users. Proceed?"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsMaintenanceOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Abort
              </button>
              <button
                disabled={actionLoading}
                onClick={toggleMaintenanceSetting}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all"
              >
                Confirm Guard Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Signups gate confirmation */}
      {isSignupsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Authentication gate toggle</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  {publicSignups 
                    ? "Disabling signups will prevent new user registrations until re-enabled." 
                    : "New business profiles will be allowed to register on the platform. Proceed?"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsSignupsOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={togglePublicSignupsSetting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
              >
                Confirm Gateway Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
