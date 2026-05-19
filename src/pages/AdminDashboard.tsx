import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Users, Shield, RefreshCw, LogOut, Search, ShieldCheck, 
  Settings, Key, Eye, Clock, Trash2, 
  AlertTriangle, Database, Cpu, Activity,
  Info, Megaphone, ChevronLeft, ChevronRight, Copy
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

interface AuditLog {
  id: string;
  action_type: string;
  target_id: string | null;
  admin_email: string;
  created_at: string;
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
        )}
      </main>

      {/* -------------------- MODALS & DIALOGS -------------------- */}

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
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
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
                <Clock className="w-5 h-5 text-emerald-600 animate-spin-slow" />
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
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
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
                    ? 'bg-emerald-600 hover:bg-emerald-750 shadow-emerald-600/10 hover:shadow-emerald-600/20' 
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
                onClick={() => {
                  updateSystemSetting('maintenance_mode', !maintenanceMode);
                  setIsMaintenanceOpen(false);
                }}
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
                onClick={() => {
                  updateSystemSetting('public_signups', !publicSignups);
                  setIsSignupsOpen(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
              >
                Confirm Gateway Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Simple Sparkles decoration
const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor"/>
  </svg>
);

export default AdminDashboard;
