import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Mail, Lock, User, AlertTriangle, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';

export const Register = ({ onToggleLogin }) => {
  const register = useAuthStore((state) => state.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('attendee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      return setError('Please fill in all fields');
    }
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, role);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 md:px-0 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-indigo/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md glass p-8 md:p-10 rounded-2xl relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Sign up to reserve seats and unlock event analytics
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
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-dark-900/60 border border-white/5 rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-indigo/40 focus:ring-1 focus:ring-brand-indigo/40 transition-all"
                required
              />
            </div>
          </div>

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

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Choose Access Role
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('attendee')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  role === 'attendee'
                    ? 'border-brand-indigo bg-brand-indigo/10 text-brand-indigo'
                    : 'border-white/5 bg-dark-900/30 text-gray-400 hover:text-gray-300'
                }`}
              >
                <Ticket className="w-5 h-5 mb-1" />
                <span className="text-sm font-semibold">Attendee</span>
                <span className="text-[10px] opacity-75 mt-0.5">Book seats</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('organizer')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  role === 'organizer'
                    ? 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan'
                    : 'border-white/5 bg-dark-900/30 text-gray-400 hover:text-gray-300'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mb-1" />
                <span className="text-sm font-semibold">Organizer</span>
                <span className="text-[10px] opacity-75 mt-0.5">Manage events</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-lg py-3 font-semibold text-sm transition-all shadow-glow-brand flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Registering...' : 'Create Account'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <button
              onClick={onToggleLogin}
              className="text-brand-indigo font-semibold hover:underline bg-transparent"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Register;
