import React, { useState } from 'react';
import { 
  Wallet, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  appName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  appName = 'VARAVU&SELAVU',
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please fill in both email and password.');
        }
        if (password.length < 6) {
          throw new Error('Password should be at least 6 characters long.');
        }
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter both your email and password.');
        }
        await signInWithEmail(email.trim(), password);
      }
      if (onClose) onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      // Clean standard firebase error messages
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try logging in.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      if (onClose) onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      if (!msg.includes('auth/popup-closed-by-user')) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header with App Branding */}
        <div className="text-center relative z-10 space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30 mb-2">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 light:text-slate-900 tracking-tight">
            {mode === 'login' ? 'Welcome Back to ' : 'Create Your Account on '}
            <span className="text-indigo-400 light:text-indigo-600">{appName}</span>
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-600 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Log in to sync your expenses, budgets, and split debts across all your devices with cloud storage.'
              : 'Sign up to safely back up your finances, groups, and personal ledger to the cloud.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-400 light:text-rose-600 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Google One-Click Auth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700/80 light:border-slate-300 bg-slate-800/80 light:bg-slate-50 hover:bg-slate-750 light:hover:bg-slate-100 text-sm font-semibold text-slate-100 light:text-slate-900 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 mb-4 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800 light:border-slate-200" />
          </div>
          <span className="relative px-3 bg-slate-900 light:bg-white text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Siva"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Toggle */}
        <div className="mt-5 text-center pt-4 border-t border-slate-800/80 light:border-slate-200">
          <p className="text-xs text-slate-400 light:text-slate-600">
            {mode === 'login' ? "Don't have an account yet?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="text-indigo-400 light:text-indigo-600 font-bold hover:underline cursor-pointer ml-1"
            >
              {mode === 'login' ? 'Create a new account' : 'Log in here'}
            </button>
          </p>
        </div>

        {/* Cloud feature perks */}
        <div className="mt-5 pt-3 border-t border-slate-800/40 light:border-slate-200/60 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Multi-device Realtime Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private & Encrypted DB</span>
          </div>
        </div>

        {/* Optional Skip / Continue locally button if user opened modal voluntarily */}
        {onClose && (
          <div className="mt-3 text-center">
            <button
              onClick={onClose}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline"
            >
              Continue in Guest Mode (Offline)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
