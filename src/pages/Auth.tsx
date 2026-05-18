import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  User, 
  Phone, 
  CheckCircle2, 
  Zap, 
  Shield 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: formData.email, 
          password: formData.password 
        });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: formData.email, 
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              mobile: formData.mobile
            }
          }
        });
        if (error) throw error;
        alert('Registration successful! Please check your email for verification.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <Shield className="w-5 h-5" />, title: "Enterprise Security", desc: "Your financial data is encrypted and protected with industry-leading protocols." },
    { icon: <Zap className="w-5 h-5" />, title: "Instant Settlements", desc: "Track and manage credit/debit entries with zero delay and 100% accuracy." },
    { icon: <CheckCircle2 className="w-5 h-5" />, title: "Audit-Ready Reports", desc: "Generate professional ledger statements and reports in one click." }
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] flex w-full bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      {/* Left Side: Features & Branding (Visible on Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 dark:bg-slate-950 flex-col justify-between p-16 relative border-r border-slate-800 transition-colors duration-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.1),transparent)] pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-blue-600 p-2 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Escrow Ledger</span>
          </div>

          <h2 className="text-5xl font-extrabold text-white leading-tight mb-8">
            The future of <br/>
            <span className="text-blue-500 text-6xl">Account Management</span>
          </h2>

          <div className="space-y-10 mt-16">
            {features.map((f, i) => (
              <div key={i} className="flex gap-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg mb-1">{f.title}</h4>
                  <p className="text-slate-400 leading-relaxed max-w-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/10">
          <p className="text-slate-500 text-sm italic">
            "Reliability is the foundation of every transaction we manage."
          </p>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-slate-50 lg:bg-white dark:bg-slate-900 lg:dark:bg-slate-900 overflow-y-auto transition-colors duration-200">
        <div className="w-full max-w-[480px]">
          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              {isLogin ? 'Sign in to Dashboard' : 'Create Business Account'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Start your 30-day free trial. No credit card required.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 animate-shake">
              <Shield className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 lg:bg-white dark:bg-slate-800 lg:dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Mobile No.</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input
                      name="mobile"
                      required
                      value={formData.mobile}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 lg:bg-white dark:bg-slate-800 lg:dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 lg:bg-white dark:bg-slate-800 lg:dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 lg:bg-white dark:bg-slate-800 lg:dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 lg:bg-white dark:bg-slate-800 lg:dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-200 dark:shadow-none mt-2 disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 lg:bg-white dark:bg-slate-900 px-4 text-slate-400 dark:text-slate-500 font-medium tracking-widest transition-colors duration-200">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>

          <div className="mt-8 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-blue-600 dark:text-blue-450 font-bold hover:underline"
              >
                {isLogin ? 'Sign up for free' : 'Log in here'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
