import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Cloud,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  ExternalLink,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../utils/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  appName?: string;
  initialMode?: 'login' | 'signup';
  onSuccess?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  appName = 'VARAVU&SELAVU',
  initialMode = 'login',
  onSuccess,
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync mode whenever initialMode or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setErrorAction(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
    setErrorAction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorAction(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanPass = password.trim();

      if (!cleanEmail) {
        throw new Error('Please enter your email address.');
      }
      if (!cleanPass) {
        throw new Error('Please enter your password.');
      }

      if (mode === 'signup') {
        if (cleanPass.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (cleanPass !== confirmPassword.trim()) {
          throw new Error('Passwords do not match. Please re-enter both passwords carefully.');
        }
        await signUpWithEmail(cleanEmail, cleanPass, name.trim());
        if (onSuccess) {
          onSuccess(`Account created! Welcome, ${name.trim() || cleanEmail.split('@')[0]}.`);
        }
      } else {
        await signInWithEmail(cleanEmail, cleanPass);
        if (onSuccess) {
          onSuccess(`Signed in successfully as ${cleanEmail}`);
        }
      }
      if (onClose) onClose();
    } catch (err: unknown) {
      console.error('Authentication Error:', err);
      const rawMsg = err instanceof Error ? err.message : 'Authentication failed';

      // Interpret Firebase Auth error codes
      if (rawMsg.includes('auth/operation-not-allowed')) {
        setError(
          'Email/Password sign-in is disabled in your Firebase project. Enable "Email/Password" in Firebase Console ➜ Build ➜ Authentication ➜ Sign-in method, or sign in with Google below.'
        );
      } else if (rawMsg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists.');
        setErrorAction({
          label: 'Switch to Log In',
          onClick: () => handleModeSwitch('login'),
        });
      } else if (rawMsg.includes('auth/weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (rawMsg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address (e.g., user@example.com).');
      } else if (
        rawMsg.includes('auth/invalid-credential') ||
        rawMsg.includes('auth/wrong-password') ||
        rawMsg.includes('auth/user-not-found')
      ) {
        setError('Incorrect email or password.');
        setErrorAction({
          label: 'Create an account instead?',
          onClick: () => handleModeSwitch('signup'),
        });
      } else if (rawMsg.includes('auth/too-many-requests')) {
        setError('Access temporarily disabled due to multiple failed attempts. Please try again later.');
      } else if (rawMsg.includes('auth/network-request-failed')) {
        setError('Network connection failed. Please check your internet connection.');
      } else {
        setError(rawMsg.replace(/^Firebase:\s*/, ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setErrorAction(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      if (onSuccess) {
        onSuccess('Signed in with Google successfully!');
      }
      if (onClose) onClose();
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      const rawMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!rawMsg.includes('auth/popup-closed-by-user')) {
        if (rawMsg.includes('auth/popup-blocked')) {
          setError('Google sign-in popup was blocked by your browser. Please allow popups for this site.');
        } else if (rawMsg.includes('auth/operation-not-allowed')) {
          setError('Google provider is disabled in Firebase Console. Please enable Google in Firebase Authentication.');
        } else {
          setError(rawMsg.replace(/^Firebase:\s*/, ''));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button if dismissible */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 light:hover:text-slate-800 rounded-full hover:bg-slate-800 light:hover:bg-slate-100 transition-colors z-20 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header with App Branding */}
        <div className="text-center relative z-10 space-y-1.5 mb-5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/30 mb-1">
            <Wallet className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 light:text-slate-900 tracking-tight">
            {mode === 'login' ? 'Log In to ' : 'Create Account on '}
            <span className="text-indigo-400 light:text-indigo-600">{appName}</span>
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-600 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Access your saved expenses, groups, and split debts across all devices.'
              : 'Create your private cloud ledger with multi-device realtime sync.'}
          </p>
        </div>

        {/* Segmented Mode Selector Tabs */}
        <div className="flex p-1 bg-slate-950 light:bg-slate-100 rounded-xl border border-slate-800 light:border-slate-200 mb-5 relative z-10">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('signup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 light:text-rose-600 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-snug">{error}</span>
            </div>
            {errorAction && (
              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={errorAction.onClick}
                  className="text-xs font-bold text-indigo-400 light:text-indigo-600 underline hover:text-indigo-300 cursor-pointer"
                >
                  {errorAction.label}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Google One-Click Auth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700 light:border-slate-300 bg-slate-800/90 light:bg-slate-50 hover:bg-slate-750 light:hover:bg-slate-100 text-sm font-semibold text-slate-100 light:text-slate-900 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 mb-4 cursor-pointer"
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

        <div className="relative flex items-center justify-center my-3.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800 light:border-slate-200" />
          </div>
          <span className="relative px-3 bg-slate-900 light:bg-white text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Your Full Name
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
              Password {mode === 'signup' && <span className="text-[11px] text-slate-400 font-normal">(min 6 characters)</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer mt-3"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Log In' : 'Create My Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div className="mt-4 text-center pt-3 border-t border-slate-800/80 light:border-slate-200">
          <p className="text-xs text-slate-400 light:text-slate-600">
            {mode === 'login' ? "Don't have an account yet?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
              className="text-indigo-400 light:text-indigo-600 font-bold hover:underline cursor-pointer ml-1"
            >
              {mode === 'login' ? 'Create a new account' : 'Log in here'}
            </button>
          </p>
        </div>

        {/* Cloud feature perks */}
        <div className="mt-4 pt-3 border-t border-slate-800/40 light:border-slate-200/60 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Realtime Cloud Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private & Encrypted</span>
          </div>
        </div>

        {/* Optional Skip / Continue locally button if user opened modal voluntarily */}
        {onClose && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-slate-500 hover:text-slate-300 light:hover:text-slate-700 underline cursor-pointer"
            >
              Continue in Guest Mode (Offline)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
