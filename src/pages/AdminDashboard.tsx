import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { AdminModals } from '../components/admin/AdminModals';
import { AdminOverview } from '../components/admin/AdminOverview';
import { SystemGuards } from '../components/admin/SystemGuards';
import type { AuditLog } from '../components/admin/SystemGuards';
import { 
  Users, Shield, RefreshCw, LogOut, Search, Activity, 
  Settings, Key, Eye, Clock, Trash2, 
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  active_users: number;
  total_invoices: number; // Mapped to transactions
  total_clients: number;  // Mapped to parties
}

interface AdminUser {
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

const AdminDashboard = () => {
  const { logout } = useAdmin();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system'>('overview');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dashboard Data
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    active_users: 0,
    total_invoices: 0,
    total_clients: 0
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog / Modal States
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Action Inputs
  const [newPassword, setNewPassword] = useState('');
  const [extensionDays, setExtensionDays] = useState('30');
  
  // User Edit Inputs
  const [editPlanType, setEditPlanType] = useState('trial');
  const [editIsPaid, setEditIsPaid] = useState(false);

  // System Settings States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [publicSignups, setPublicSignups] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcastPublishing, setIsBroadcastPublishing] = useState(false);

  // Confirm Settings States
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isSignupsOpen, setIsSignupsOpen] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = async (showToast = false) => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const { data: statsData, error: statsErr } = await supabase.rpc('admin_get_stats');
      if (statsErr) throw statsErr;
      if (statsData) setStats(statsData);

      // 2. Fetch Users
      const { data: usersData, error: usersErr } = await supabase.rpc('admin_get_all_users');
      if (usersErr) throw usersErr;
      if (usersData) setUsers(usersData);

      // 3. Fetch Audit Logs
      const { data: logsData, error: logsErr } = await supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!logsErr && logsData) {
        setAuditLogs(logsData);
      }

      // 4. Fetch System Settings
      const { data: settings, error: settingsErr } = await supabase
        .from('system_settings')
        .select('*');

      if (!settingsErr && settings) {
        const maint = settings.find(s => s.key === 'maintenance_mode');
        const signups = settings.find(s => s.key === 'public_signups');
        const bcast = settings.find(s => s.key === 'platform_broadcast');

        if (maint) setMaintenanceMode(maint.value === true || maint.value === 'true');
        if (signups) setPublicSignups(signups.value === true || signups.value === 'true');
        if (bcast && bcast.value) {
          setBroadcastMessage(bcast.value.message || '');
        }
      }

      if (showToast) toast.success("Dashboard metrics revalidated!");
    } catch (err: any) {
      console.error("Error loading admin dashboard:", err);
      toast.error(`Sync error: ${err.message || 'Cannot fetch dashboard statistics'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Admin session terminated.");
    navigate('/admin');
  };

  // 1. Force Reset Password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        target_user_id: selectedUser.user_id,
        new_password: newPassword
      });
      if (error) throw error;
      toast.success(`Credentials overwritten for ${selectedUser.email}`);
      setIsResetOpen(false);
      setNewPassword('');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Extend Access
  const handleExtendPlan = async () => {
    if (!selectedUser || !extensionDays) return;
    setActionLoading(true);
    try {
      const days = parseInt(extensionDays);
      const { error } = await supabase.rpc('admin_extend_subscription', {
        target_user_id: selectedUser.user_id,
        days_to_add: days
      });
      if (error) throw error;
      toast.success(`Access period updated by ${days} days.`);
      setIsExtendOpen(false);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Toggle Block Suspension
  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_toggle_block_user', {
        target_user_id: selectedUser.user_id
      });
      if (error) throw error;
      toast.success(`User block status modified.`);
      setIsBlockOpen(false);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to change user access.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Purge Profile Data
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: selectedUser.user_id
      });
      if (error) throw error;
      toast.success(`User workspace purged permanently.`);
      setIsDeleteOpen(false);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user profile.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4b. Update User Plan & Payment Status
  const handleUpdateUserPlan = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_plan', {
        target_user_id: selectedUser.user_id,
        new_plan_type: editPlanType,
        new_is_paid: editIsPaid
      });
      if (error) throw error;
      toast.success(`User plan updated: ${editPlanType} (${editIsPaid ? 'Paid' : 'Unpaid'})`);
      setIsDetailsOpen(false);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user plan.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Update System Settings (Guards)
  const updateSystemSetting = async (key: string, value: any) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('admin_upsert_setting', {
        p_key: key,
        p_value: JSON.stringify(value)
      });
      if (error) throw error;
      toast.success(`Guard Setting '${key}' updated to ${value}`);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update guard.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Broadcast Announcements
  const handlePublishBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Announcement message cannot be empty.");
      return;
    }
    setIsBroadcastPublishing(true);
    try {
      const { error } = await supabase.rpc('admin_upsert_setting', {
        p_key: 'platform_broadcast',
        p_value: JSON.stringify({
          message: broadcastMessage,
          timestamp: new Date().toISOString()
        })
      });
      if (error) throw error;
      toast.success("Broadcast notice published successfully!");
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish announcement.");
    } finally {
      setIsBroadcastPublishing(false);
    }
  };

  // Filter & Search Logic
  const filteredUsers = users.filter(u => {
    // Exclude the admin user from the directory view
    if (u.email.toLowerCase() === 'escrow.bms@gmail.com') return false;

    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.company_name.toLowerCase().includes(term) ||
      u.user_id.toLowerCase().includes(term)
    );
  });

  // Pagination bounds
  const totalUsersCount = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsersCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalUsersCount);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Helper date formatting
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

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

  // Subscription Helper
  const getSubscriptionStatus = (user: AdminUser) => {
    if (user.is_blocked) {
      return { label: 'Suspended', style: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' };
    }
    
    if (!user.subscription_expires_at) {
      return { label: 'Free Plan', style: 'bg-slate-800 text-slate-300' };
    }

    const expiry = new Date(user.subscription_expires_at);
    if (expiry < new Date()) {
      return { label: 'Expired', style: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
    }

    return { label: 'Premium Active', style: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-900">
              Escrow Ledger <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Admin HQ</span>
            </h1>
            <p className="text-slate-500 text-xs font-semibold">Infrastructure Controls & Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadDashboardData(true)} 
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition-all"
            title="Force refresh metrics"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl border border-rose-100 hover:border-rose-600 transition-all font-bold text-xs"
          >
            <LogOut className="w-4 h-4" />
            Terminate Session
          </button>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="border-b border-slate-200 bg-white px-6 py-2 flex items-center gap-2 shadow-sm">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: <Activity className="w-4 h-4" /> },
          { id: 'users', label: 'User Directory', icon: <Users className="w-4 h-4" /> },
          { id: 'system', label: 'System Guards', icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id
                ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <AdminOverview
            stats={stats}
            loading={loading}
            maintenanceMode={maintenanceMode}
            publicSignups={publicSignups}
            setActiveTab={setActiveTab}
          />
        )}

        {/* TAB 2: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            {/* Directory Header Controls */}
            <div className="px-6 py-5 border-b border-slate-200/80 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Registered Ledger Accounts</h3>
                <p className="text-slate-500 text-xs font-semibold">Reset credentials, block access, or extend trials</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset page to 1 on search
                    }}
                    className="w-full md:w-72 h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl placeholder:text-slate-400 text-xs font-bold focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl focus:border-blue-600 focus:outline-none cursor-pointer"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size} rows</option>
                  ))}
                </select>
              </div>
            </div>

            {/* User Directory Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-4 px-6">Company / Organization</th>
                    <th className="py-4 px-6">Registered Email</th>
                    <th className="py-4 px-6">Last Activity</th>
                    <th className="py-4 px-6">Status Badge</th>
                    <th className="py-4 px-6">Time Left</th>
                    <th className="py-4 px-6">Entities Count</th>
                    <th className="py-4 px-6 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="py-5 px-6">
                          <div className="h-6 bg-slate-100 rounded animate-pulse w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 px-6 space-y-3">
                        <div className="p-4 bg-slate-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-slate-100">
                          <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">No ledger accounts match "{searchTerm}"</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const sub = getSubscriptionStatus(user);
                      return (
                        <tr key={user.user_id} className="hover:bg-slate-50 transition-all group">
                          {/* Company column */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600">
                                {user.company_name?.[0]?.toUpperCase() || 'E'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{user.company_name || 'Individual Profile'}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Joined: {formatDate(user.created_at)}</p>
                              </div>
                            </div>
                          </td>

                          {/* Email column */}
                          <td className="py-4 px-6 font-semibold text-slate-600 text-xs">
                            {user.email}
                          </td>

                          {/* Activity column */}
                          <td className="py-4 px-6 text-slate-500 text-xs">
                            <span className="font-semibold text-slate-600">{formatDateTime(user.last_sign_in_at)}</span>
                          </td>

                          {/* Subscription / status badge */}
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${sub.style}`}>
                              {sub.label}
                            </span>
                          </td>

                          {/* Time left column */}
                          <td className="py-4 px-6 text-xs font-bold whitespace-nowrap">
                            {(() => {
                              const remaining = getSubscriptionTimeRemaining(user.subscription_expires_at);
                              if (remaining.isExpired) {
                                return <span className="text-rose-500">{remaining.text}</span>;
                              }
                              if (remaining.isLow) {
                                return <span className="text-amber-500 animate-pulse">{remaining.text}</span>;
                              }
                              return <span className="text-emerald-600">{remaining.text}</span>;
                            })()}
                          </td>

                          {/* Database entities count */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                              <div>
                                <span className="text-slate-900 font-bold">{user.client_count}</span> parties
                              </div>
                              <div>
                                <span className="text-slate-900 font-bold">{user.invoice_count}</span> transactions
                              </div>
                            </div>
                          </td>

                          {/* Operation actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Analysis button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditPlanType(user.plan_type || 'trial');
                                  setEditIsPaid(user.is_paid || false);
                                  setIsDetailsOpen(true);
                                }}
                                className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 rounded-lg border border-blue-100 transition-all shadow-sm"
                                title="Workspace Analysis"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Reset Pass button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsResetOpen(true);
                                  setNewPassword('');
                                }}
                                className="p-2 text-amber-600 hover:text-white hover:bg-amber-600 bg-amber-50 rounded-lg border border-amber-100 transition-all shadow-sm"
                                title="Forced credential reset"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              {/* Extend plan button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsExtendOpen(true);
                                  setExtensionDays('30');
                                }}
                                className="p-2 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100 transition-all shadow-sm"
                                title="Extend client operational limit"
                              >
                                <Clock className="w-4 h-4" />
                              </button>

                              {/* Block toggle button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsBlockOpen(true);
                                }}
                                className={`p-2 rounded-lg border transition-all shadow-sm ${
                                  user.is_blocked
                                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-100'
                                    : 'text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border-rose-100'
                                }`}
                                title={user.is_blocked ? 'Unblock client access' : 'Restrict client access'}
                              >
                                <Shield className="w-4 h-4" />
                              </button>

                              {/* Purge delete button */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteOpen(true);
                                }}
                                className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 rounded-lg border border-rose-100 transition-all shadow-sm"
                                title="Purge user profile data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Directory Pagination controls */}
            {!loading && totalUsersCount > 0 && (
              <div className="px-6 py-4 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
                <p>
                  Showing {startIndex + 1}-{endIndex} of {totalUsersCount} ledger profiles
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pNum = idx + 1;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            safePage === pNum
                              ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 disabled:opacity-30 transition-all shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM GUARDS */}
        {activeTab === 'system' && (
          <SystemGuards
            maintenanceMode={maintenanceMode}
            publicSignups={publicSignups}
            broadcastMessage={broadcastMessage}
            setBroadcastMessage={setBroadcastMessage}
            isBroadcastPublishing={isBroadcastPublishing}
            handlePublishBroadcast={handlePublishBroadcast}
            setIsMaintenanceOpen={setIsMaintenanceOpen}
            setIsSignupsOpen={setIsSignupsOpen}
            auditLogs={auditLogs}
            formatDateTime={formatDateTime}
          />
        )}
      </main>

      {/* -------------------- MODALS & DIALOGS -------------------- */}
      <AdminModals
        selectedUser={selectedUser}
        actionLoading={actionLoading}
        isDetailsOpen={isDetailsOpen}
        setIsDetailsOpen={setIsDetailsOpen}
        editPlanType={editPlanType}
        setEditPlanType={setEditPlanType}
        editIsPaid={editIsPaid}
        setEditIsPaid={setEditIsPaid}
        handleUpdateUserPlan={handleUpdateUserPlan}
        isResetOpen={isResetOpen}
        setIsResetOpen={setIsResetOpen}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        handleResetPassword={handleResetPassword}
        isExtendOpen={isExtendOpen}
        setIsExtendOpen={setIsExtendOpen}
        extensionDays={extensionDays}
        setExtensionDays={setExtensionDays}
        handleExtendPlan={handleExtendPlan}
        isBlockOpen={isBlockOpen}
        setIsBlockOpen={setIsBlockOpen}
        handleToggleBlock={handleToggleBlock}
        isDeleteOpen={isDeleteOpen}
        setIsDeleteOpen={setIsDeleteOpen}
        handleDeleteUser={handleDeleteUser}
        isMaintenanceOpen={isMaintenanceOpen}
        setIsMaintenanceOpen={setIsMaintenanceOpen}
        maintenanceMode={maintenanceMode}
        toggleMaintenanceSetting={() => {
          updateSystemSetting('maintenance_mode', !maintenanceMode);
          setIsMaintenanceOpen(false);
        }}
        isSignupsOpen={isSignupsOpen}
        setIsSignupsOpen={setIsSignupsOpen}
        publicSignups={publicSignups}
        togglePublicSignupsSetting={() => {
          updateSystemSetting('public_signups', !publicSignups);
          setIsSignupsOpen(false);
        }}
      />
    </div>
  );
};

export default AdminDashboard;
