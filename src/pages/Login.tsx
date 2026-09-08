import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const [searchParams] = useSearchParams();
  const isLogin = searchParams.get('mode') === 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(isLogin ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { signInWithEmail, signInWithGoogle, busy } = useAuth();

  // Where to go once signed in: sign-up → onboarding, log-in → where she came from.
  const from = (location.state as { from?: string } | null)?.from;
  const afterSignIn = () => navigate(mode === 'signup' ? '/onboarding' : from ?? '/app/for-you', { replace: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // PLUG(supabase): with magic links this resolves null and the redirect
    // happens in the auth callback instead. Local sign-in is instant.
    const session = await signInWithEmail(email);
    if (session) afterSignIn();
  };

  const handleGoogle = async () => {
    const session = await signInWithGoogle();
    if (session) afterSignIn();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-center mb-8">
          {mode === 'signup' ? t('createAccount') : t('welcomeBack')}
        </h1>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full py-3.5 border border-border rounded-full text-sm font-medium flex items-center justify-center gap-3 hover:bg-card transition-colors mb-4 disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {t('continueWithGoogle')}
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t('or')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder={t('emailAddress')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 bg-card border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy ? t('signingIn') : mode === 'signup' ? t('signUp') : t('logIn')}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {mode === 'signup' ? t('alreadyHaveAccount') : t('dontHaveAccount')}{' '}
          <button
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-foreground underline underline-offset-4"
          >
            {mode === 'signup' ? t('logIn') : t('signUp')}
          </button>
        </p>
      </div>
    </div>
  );
}
