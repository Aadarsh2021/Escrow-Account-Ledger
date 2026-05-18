import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Save, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CompanySettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          company_name: companyName,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;
      
      // Refresh the global profile state to update navbar instantly
      await refreshProfile();
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Company Settings</h1>
            <p className="text-slate-500 dark:text-slate-400">Update your primary business identity.</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 dark:shadow-none rounded-xl font-bold text-xs transition-all self-start sm:self-center"
        >
          <XCircle className="w-3.5 h-3.5" />
          Exit
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 transition-colors duration-200">
        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1 text-center block w-full">Registered Company Name</label>
          <div className="relative group">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 transition-colors" />
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-bold text-xl placeholder:text-slate-500"
              placeholder="e.g. Escrow Solutions Ltd."
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic">
            * This name will be displayed across your entire ledger and reports.
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 animate-pulse" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <ShieldCheck className="w-5 h-5" />
            <p className="font-medium text-sm">Company name updated successfully!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Company Name
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CompanySettings;
