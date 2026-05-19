import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ChevronRight, 
  ShieldCheck, 
  Percent, 
  UserCircle, 
  Activity, 
  Save, 
  Loader2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const CreateParty = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    srNo: '',
    partyName: '',
    status: 'take', // take or give
    commissionType: 'with', // with or without
    commissionRate: '3.5' // default 3.5% for take
  });

  const fetchNextSrNo = async () => {
    try {
      const { count, error } = await supabase
        .from('parties')
        .select('*', { count: 'exact', head: true });
        
      if (!error && count !== null) {
        setFormData(prev => ({ ...prev, srNo: String(count + 1) }));
      } else {
        setFormData(prev => ({ ...prev, srNo: '1' }));
      }
    } catch (err) {
      console.error("Error fetching next SR NO:", err);
      setFormData(prev => ({ ...prev, srNo: '1' }));
    }
  };

  useEffect(() => {
    fetchNextSrNo();
  }, []);

  // Auto-update rate based on status
  useEffect(() => {
    if (formData.commissionType === 'with') {
      const newRate = formData.status === 'take' ? '3.5' : '1';
      setFormData(prev => ({ ...prev, commissionRate: newRate }));
    } else {
      setFormData(prev => ({ ...prev, commissionRate: '0' }));
    }
  }, [formData.status, formData.commissionType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error: dbError } = await supabase
        .from('parties')
        .insert([{
          user_id: user.id,
          sr_no: formData.srNo,
          party_name: formData.partyName,
          status: formData.status,
          commission_type: formData.commissionType,
          commission_rate: parseFloat(formData.commissionRate)
        }]);

      if (dbError) throw dbError;
      
      setSuccess(true);
      setFormData({
        srNo: '',
        partyName: '',
        status: 'take',
        commissionType: 'with',
        commissionRate: '3.5'
      });
      // Fetch the next serial number for the next entry
      await fetchNextSrNo();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create New Party</h1>
            <p className="text-slate-500 dark:text-slate-400">Register a new client or business partner in your ledger.</p>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Part 1: Party Information */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-200">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Party Information</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Serial Number (SR NO)</label>
                <div className="relative">
                  <input
                    name="srNo"
                    required
                    readOnly
                    value={formData.srNo}
                    className="w-full pl-5 pr-12 py-3.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl outline-none font-bold cursor-not-allowed"
                    placeholder="Auto-generating..."
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic ml-1">* Auto-generated sequentially</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Party Name</label>
                <input
                  name="partyName"
                  required
                  value={formData.partyName}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium"
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Account Status</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'take' }))}
                    className={`py-3.5 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                      formData.status === 'take' 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    Take (Lena)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'give' }))}
                    className={`py-3.5 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                      formData.status === 'give' 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    Give (Dena)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Part 2: Incentive / Commission */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-200">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Percent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Incentive Settings</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Commission Option</label>
                <select
                  name="commissionType"
                  value={formData.commissionType}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium appearance-none"
                >
                  <option value="with">With Commission</option>
                  <option value="without">No Commission</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Commission Rate (%)</label>
                <div className="relative">
                  <input
                    name="commissionRate"
                    type="number"
                    step="0.01"
                    disabled={formData.commissionType === 'without'}
                    value={formData.commissionRate}
                    onChange={handleChange}
                    className={`w-full px-5 py-3.5 border rounded-2xl focus:ring-2 outline-none transition-all font-bold text-xl ${
                      formData.commissionType === 'without' 
                      ? 'bg-slate-105 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 focus:ring-blue-600/10 focus:border-blue-600'
                    }`}
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 italic ml-1">
                  * Auto-calculated: 3% for Take, 1% for Give
                </p>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 flex gap-4">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Based on current settings, this party will be registered with a <strong>{formData.commissionRate}%</strong> commission rate for <strong>{formData.status.toUpperCase()}</strong> status.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 animate-shake">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <ShieldCheck className="w-5 h-5" />
            <p className="font-medium text-sm">Party created successfully!</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-50 group"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Save className="w-6 h-6" />
                Save Party Details
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateParty;
