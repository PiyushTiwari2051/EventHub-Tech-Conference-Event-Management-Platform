import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

export const Login = ({ onToggleRegister }) => {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return setError('Please fill in all fields');
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 md:px-0 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-indigo/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md glass p-8 md:p-10 rounded-2xl relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Securely sign in to reserve seats and manage your tickets
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2.5 bg-brand-rose/10 border border-brand-rose/20 text-brand-rose p-3 rounded-lg text-sm mb-6 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-indigo/40 focus:ring-1 focus:ring-brand-indigo/40 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-indigo/40 focus:ring-1 focus:ring-brand-indigo/40 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg py-3 font-semibold text-sm transition-all shadow-glow-brand flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Don't have an account?{' '}
            <button
              onClick={onToggleRegister}
              className="text-brand-indigo font-semibold hover:underline bg-transparent"
            >
              Sign up today
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
