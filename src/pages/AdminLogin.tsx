import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { toast } from 'react-hot-toast';
import { Shield, Key, Mail, Lock } from 'lucide-react';

const ADMIN_REMEMBER_ME_KEY = 'escrow_admin_remember_me';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const { login } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_REMEMBER_ME_KEY);
    if (saved) {
      setUsername(saved);
    }
  }, []);

  // Update lockout countdown
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const diff = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setLockoutUntil(null);
        setRemainingTime(0);
        clearInterval(interval);
      } else {
        setRemainingTime(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast.error(`Account Locked. Try again in ${remainingTime} seconds.`);
      return;
    }

    const success = await login(username, password);
    if (success) {
      if (rememberMe) {
        localStorage.setItem(ADMIN_REMEMBER_ME_KEY, username);
      } else {
        localStorage.removeItem(ADMIN_REMEMBER_ME_KEY);
      }
      setFailedAttempts(0);
      setLockoutUntil(null);
      toast.success("Admin access authorized successfully!");
      navigate('/admin/dashboard');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        // Exponential backoff: base 30s * (attempts - 4)
        const blockDuration = 30000 * Math.pow(2, newAttempts - 5);
        setLockoutUntil(Date.now() + blockDuration);
        setRemainingTime(blockDuration / 1000);
        toast.error(`Too many failed attempts. Locked out for ${blockDuration / 1000} seconds.`);
      } else {
        toast.error(`Invalid credentials. ${5 - newAttempts} attempts remaining.`);
      }
    }
  };

  const isLocked = lockoutUntil && Date.now() < lockoutUntil;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4 shadow-sm">
            <Shield className="w-10 h-10 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Terminal</h2>
          <p className="text-slate-500 text-xs mt-1.5 font-bold tracking-wide">SECURE ADMINISTRATIVE SYSTEM GATEWAY</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="admin@escrowbill.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!isLocked}
                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Security Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!isLocked}
                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl placeholder:text-slate-400 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={!!isLocked}
                className="w-4 h-4 rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-500">Remember session email</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!!isLocked}
            className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98] transition-all disabled:bg-rose-50 disabled:text-rose-500 disabled:border disabled:border-rose-200 disabled:scale-100 disabled:shadow-none"
          >
            {isLocked ? (
              <span className="flex items-center justify-center gap-2">
                <Key className="w-4 h-4 animate-spin" />
                Locked Out ({remainingTime}s)
              </span>
            ) : (
              "Authorize Access"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center space-x-2 text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] uppercase tracking-wider font-extrabold">
            Encrypted Session Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
