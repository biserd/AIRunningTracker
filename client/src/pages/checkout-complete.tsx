import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import PublicHeader from '@/components/PublicHeader';
import Footer from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';

type Status = 'email' | 'connecting' | 'error';

export default function CheckoutCompletePage() {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  const [status, setStatus] = useState<Status>(() => localStorage.getItem('auth_token') ? 'connecting' : 'email');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !sessionId || !localStorage.getItem('auth_token')) return;
    started.current = true;
    const connect = async () => {
      try {
        const response = await fetch('/api/stripe/claim-guest-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
          body: JSON.stringify({ sessionId }),
        });
        const body = await response.json().catch(() => ({}));
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          setMessage('Your sign-in expired. Use the link sent to your checkout email.');
          setStatus('email');
          return;
        }
        if (!response.ok) throw new Error(body.message || 'We could not connect your checkout.');
        window.location.assign(typeof body.returnTo === 'string' && body.returnTo.startsWith('/') && !body.returnTo.startsWith('//')
          ? body.returnTo : '/dashboard?welcome=1');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'We could not connect your checkout.');
        setStatus('error');
      }
    };
    void connect();
  }, [sessionId]);

  const resend = async () => {
    if (!sessionId) return;
    await fetch('/api/stripe/resend-guest-checkout-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);
    setMessage('If checkout completed, a fresh link is on its way to the email you used there.');
  };

  return <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
    <SEO title="Complete your trial | Run Analytics" description="Confirm your email to connect your Run Analytics trial." />
    <PublicHeader />
    <main className="mx-auto max-w-lg px-5 py-16 sm:py-24">
      <div className="rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl sm:p-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-[#c63b00]">
          {status === 'connecting' ? <Loader2 className="h-7 w-7 animate-spin" /> : status === 'error' ? <Mail className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{status === 'connecting' ? 'Connecting your trial…' : 'Checkout complete'}</h1>
        <p className="mt-4 leading-7 text-slate-600">
          {status === 'error' ? message : status === 'connecting'
            ? 'We’re securely connecting your Premium access.'
            : 'Check the email address you entered in Stripe. Tap the one-time Run Analytics link to finish setting up your account, then connect Strava.'}
        </p>
        {status === 'email' && sessionId && <Button className="mt-7 bg-[#c63b00] hover:bg-[#a83200]" onClick={resend}>Send the link again</Button>}
        {status === 'error' && <Button className="mt-7 bg-[#c63b00] hover:bg-[#a83200]" onClick={() => window.location.reload()}>Try connecting again</Button>}
        {message && status === 'email' && <p className="mt-4 text-sm text-slate-500">{message}</p>}
        {!sessionId && <p className="mt-4 text-sm text-amber-700">Missing checkout details. Contact hello@aitracker.run for help.</p>}
        <p className="mt-7 text-sm text-slate-500">Already have an account? <Link href="/auth" className="font-semibold text-[#c63b00] hover:underline">Sign in with the same email</Link>.</p>
      </div>
    </main>
    <Footer />
  </div>;
}
