import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCircle, 
  Mail, 
  Phone, 
  Lock, 
  Save, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  Building2,
  KeyRound,
  MapPin,
  Globe,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    website: ''
  });

  const [passData, setPassData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        email: user?.email || '',
        phone: profile.company_phone || '',
        address: profile.company_address || '',
        website: profile.company_website || ''
      });
    }
  }, [profile, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: formData.fullName,
          company_phone: formData.phone,
          company_address: formData.address,
          company_website: formData.website,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;
      await refreshProfile();
      setSuccess(true);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    setPassLoading(true);
    setError(null);

    try {
      const { error: passError } = await supabase.auth.updateUser({
        password: passData.newPassword
      });
      if (passError) throw passError;
      alert('Password updated successfully!');
      setPassData({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <UserCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage your personal information and security.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              <Lock className="w-4 h-4" />
              Edit Profile
            </button>
          )}
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 dark:shadow-none rounded-2xl font-bold text-sm transition-all whitespace-nowrap"
          >
            <XCircle className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Personal & Business Information
              </h2>
              {isEditing && (
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                  Editing Mode
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Company Name (Fixed)</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
                  <input
                    value={profile?.company_name || 'Not Set'}
                    readOnly
                    title="Change company name from Company Settings"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1 italic">* Editable only from Company Settings page</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <UserCircle className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isEditing ? 'text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600' : 'text-slate-300 dark:text-slate-600'}`} />
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    readOnly={!isEditing}
                    className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none transition-all font-medium ${isEditing ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Business Email (Login Email)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-600" />
                  <input
                    value={formData.email}
                    readOnly
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isEditing ? 'text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600' : 'text-slate-300 dark:text-slate-600'}`} />
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    readOnly={!isEditing}
                    className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none transition-all font-medium ${isEditing ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                    placeholder="+91 00000 00000"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Website (Optional)</label>
                <div className="relative group">
                  <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isEditing ? 'text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600' : 'text-slate-300 dark:text-slate-600'}`} />
                  <input
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    readOnly={!isEditing}
                    className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none transition-all font-medium ${isEditing ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                    placeholder="https://company.com"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
                <div className="relative group">
                  <MapPin className={`absolute left-4 top-4 w-5 h-5 transition-colors ${isEditing ? 'text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600' : 'text-slate-300 dark:text-slate-600'}`} />
                  <textarea
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    readOnly={!isEditing}
                    className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none transition-all font-medium resize-none ${isEditing ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
                    placeholder="Full office address..."
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset data to current profile
                    if (profile) {
                      setFormData({
                        fullName: profile.full_name || '',
                        email: user?.email || '',
                        phone: profile.company_phone || '',
                        address: profile.company_address || '',
                        website: profile.company_website || ''
                      });
                    }
                  }}
                  className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Security Section */}
        <div className="space-y-8">
          <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Security
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="password"
                    required
                    value={passData.newPassword}
                    onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium placeholder:text-slate-500"
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="password"
                    required
                    value={passData.confirmPassword}
                    onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium placeholder:text-slate-500"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {passLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              Update Password
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center gap-3 animate-in fade-in">
              <ShieldCheck className="w-5 h-5" />
              <p className="font-medium text-sm">Profile updated successfully!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
