import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Skeleton } from '@heroui/react';
import { electronAPI } from '../lib/api';
import { CheckCircleIcon, SparkIcon } from '../components/icons';
import { BrandMark } from '../components/primitives';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'demo' | 'signup'>(() =>
    new URLSearchParams(location.search).get('mode') === 'signup' ? 'signup' : 'demo',
  );
  const [loading, setLoading] = useState<'caregiver' | 'moderator' | 'register' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

  const enterAfterLogin = (result: any) => {
    sessionStorage.setItem('currentUser', JSON.stringify(result.user));
    if (result.user?.role === 'moderator') {
      navigate('/dashboard', { replace: true });
      return;
    }
    const completed = result.profile?.onboarding?.completed;
    navigate(completed ? '/family-dashboard' : '/onboarding', { replace: true });
  };

  const handleDemo = async (role: 'caregiver' | 'moderator') => {
    setLoading(role);
    setMsg(null);
    try {
      const result = await electronAPI.demoLogin(role === 'moderator' ? 'moderator' : undefined);
      if (result && result.success) {
        enterAfterLogin(result);
        return;
      }
      setMsg((result && result.message) || 'Demo sign-in failed. Please try again.');
    } catch {
      setMsg('Demo sign-in failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMsg(null);
    if (!form.email.trim() && !form.phone.trim()) {
      setMsg('Enter an email address or mobile number to continue.');
      return;
    }

    setLoading('register');
    try {
      const result = await electronAPI.register({ ...form, remember: true });
      if (result && result.success) {
        enterAfterLogin(result);
        return;
      }
      setMsg((result && result.message) || 'Could not create your account. Please try again.');
    } catch {
      setMsg('Could not create your account. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pg-login flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      {/* Ambient wash */}
      <div className="pointer-events-none fixed left-[-12%] top-[-16%] size-[46rem] rounded-full bg-brand-300/25 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-14%] right-[-10%] size-[40rem] rounded-full bg-brand-400/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand */}
        <div className="mb-5 flex items-center gap-3">
          <BrandMark size="lg" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-faint">// Family Gateway</p>
            <h1 className="mt-0.5 font-display text-[17px] font-bold text-ink">Hertz &amp; Haven</h1>
          </div>
        </div>

        <p className="mb-5 text-[14px] leading-relaxed text-ink-muted">
          Sensing danger, delivering Haven. <strong className="font-semibold text-ink">Stay close to the people you love — even from afar.</strong>{' '}
          Fall detection, entry alerts and room-level monitoring for your parents' home.
        </p>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-brand-50 p-1" role="tablist" aria-label="Account options">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => { setMode('signup'); setMsg(null); }}
            className={`rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            Create Account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'demo'}
            onClick={() => { setMode('demo'); setMsg(null); }}
            className={`rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${mode === 'demo' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
          >
            Demo Access
          </button>
        </div>

        {mode === 'signup' ? (
          <Card className="border border-line bg-surface p-6 shadow-[0_18px_50px_rgba(40,53,74,0.10)]">
            <h2 className="font-display text-[21px] font-bold text-ink">Create your family account</h2>
            <p className="mb-5 mt-1.5 text-[13px] leading-relaxed text-ink-muted">Start with your details. You’ll add your parent’s home and contacts in the next step.</p>
            <form className="space-y-4" onSubmit={(event) => void handleRegister(event)}>
              <label className="block text-[12px] font-semibold text-ink-muted">
                Your full name
                <input
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Ananya Sharma"
                  required
                  minLength={2}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] font-semibold text-ink-muted">
                  Email
                  <input
                    className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block text-[12px] font-semibold text-ink-muted">
                  Mobile number
                  <input
                    className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+91 98XXX XXXXX"
                  />
                </label>
              </div>
              <label className="block text-[12px] font-semibold text-ink-muted">
                Password
                <input
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </label>
              {msg && <p role="alert" className="rounded-xl border border-signal-alert/25 bg-signal-alert/[0.07] px-3.5 py-2.5 text-[13px] text-signal-alert">{msg}</p>}
              <button
                type="submit"
                disabled={loading === 'register'}
                className="w-full rounded-xl bg-brand-action px-4 py-3.5 text-[14px] font-bold text-white transition hover:bg-brand-action-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-wait disabled:opacity-65"
              >
                {loading === 'register' ? 'Creating account…' : 'Create Family Account'}
              </button>
            </form>
          </Card>
        ) : (
        /* Demo panel */
        <Card className="border border-dashed border-brand-400 bg-surface/70 p-6 shadow-[0_18px_50px_rgba(40,53,74,0.10)]">
          <div className="mb-1 flex items-center justify-center gap-2 text-[13px] font-bold text-brand-600">
            <SparkIcon className="size-3.5" />
            Quick Demo Sign-In
          </div>
          <p className="mb-4 text-center text-[12px] leading-relaxed text-ink-muted">
            Continue as Rishabh — Flat 402, Bengaluru
          </p>

          {loading ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Button variant="primary" size="lg" fullWidth onPress={() => void handleDemo('caregiver')}>
              One-tap Demo Access
            </Button>
          )}

          <div className="my-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          {loading === 'moderator' ? (
            <Skeleton className="h-11 w-full rounded-xl" />
          ) : (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              isDisabled={loading !== null}
              onPress={() => void handleDemo('moderator')}
            >
              Open Moderator Console
            </Button>
          )}

          {msg && (
            <p className="mt-3 rounded-xl border border-signal-alert/25 bg-signal-alert/[0.07] px-3.5 py-2.5 text-[13px] text-signal-alert">
              {msg}
            </p>
          )}
        </Card>
        )}

        {/* Trust row */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {[
            'One-tap demo access',
            'Onboarding guides your setup',
            'All data stored locally',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
              <CheckCircleIcon className="size-3 fill-signal-ok" />
              {t}
            </span>
          ))}
        </div>

        <Link
          to="/"
          className="mt-6 block text-center text-[13px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
