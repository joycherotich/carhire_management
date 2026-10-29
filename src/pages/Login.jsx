import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from '../context';
import { Logo } from '../components/Layout';
import { Modal, useToast } from '../components/ui';

const GLOW = 'radial-gradient(ellipse 75% 62% at 50% 58%, #3a69a8 0%, #1B4D89 24%, #0D2149 56%, #08162F 88%)';

export default function Login() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState(''), [pw, setPw] = useState('');
  const [show, setShow] = useState(false), [remember, setRemember] = useState(true);
  const [err, setErr] = useState({}), [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false), [fe, setFe] = useState('');
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address';
    if (pw.length < 6) er.pw = 'Password must be at least 6 characters';
    setErr(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    try { await login(email, pw, remember); nav('/'); }
    catch (x) { setErr({ form: x.message }); setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile hero */}
      <div className="relative h-56 overflow-hidden lg:hidden" style={{ background: GLOW }}>
        <div className="absolute left-5 top-5"><Logo dark /></div>
        <img src="/mazda.jpeg" alt="Navy blue Mazda CX-5" className="absolute inset-x-0 bottom-0 h-[85%] w-full object-contain mix-blend-multiply" />
      </div>

      {/* Desktop showcase */}
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:w-[55%] lg:flex-col lg:justify-between" style={{ background: GLOW }}>
        <img src="/mazda.jpeg" alt="Navy blue Mazda CX-5" className="pointer-events-none absolute inset-x-0 bottom-[2%] h-[62%] w-full object-contain mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-midnight/60" />
        <div className="pointer-events-none absolute -right-24 top-0 h-full w-px rotate-12 bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
        <div className="relative"><Logo dark /></div>
        <div className="relative max-w-xl">
          <span className="inline-block rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-[11px] font-medium tracking-[0.2em] text-gold">SMART CAR HIRE MANAGEMENT</span>
          <div className="my-5 h-px w-24 bg-gold" />
          <h1 className="font-heading text-5xl font-semibold leading-[1.15] !text-white">Your Drive.<br />Your Business.<br /><span className="text-gold">Your Success.</span></h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">Every journey counts. Track your earnings, manage your fleet, and drive your business toward greater profitability.</p>
        </div>
      </section>

      {/* Auth */}
      <section className="flex flex-1 items-center justify-center bg-[#FAFBFD] px-6 py-10">
        <form onSubmit={submit} className="w-full max-w-md animate-fadeUp" noValidate>
          <h2 className="text-3xl font-semibold">Welcome Back</h2>
          <p className="mt-2 text-slate-500">Sign in to your BridgeLink dashboard.</p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="label">Email address</label>
              <div className="relative"><Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input className="input !pl-10" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {err.email && <p className="mt-1 text-xs text-bad">{err.email}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative"><Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input className="input !px-10" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400 hover:text-navy" aria-label="Toggle password">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              {err.pw && <p className="mt-1 text-xs text-bad">{err.pw}</p>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Remember me</label>
              <button type="button" onClick={() => setForgot(true)} className="font-medium text-royal hover:underline">Forgot password?</button>
            </div>
            {err.form && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">{err.form}</p>}
            <button disabled={loading} className="btn-primary group w-full !py-3 shadow-lg shadow-navy/20">
              {loading ? <><Loader2 size={18} className="animate-spin" />Signing in…</> : <>Sign In<ArrowRight size={16} className="transition group-hover:translate-x-1" /></>}
            </button>
          </div>
          <div className="mt-8 rounded-xl border border-dashed border-gold/50 bg-gold/5 p-3 text-xs text-slate-600">
            <b className="text-navy">Demo login</b> — {DEMO_EMAIL} / {DEMO_PASSWORD}
          </div>
        </form>
      </section>

      <Modal open={forgot} onClose={() => setForgot(false)} title="Reset your password">
        <p className="mb-4 text-sm text-slate-500">Enter your email and we'll send a reset link. (Demo: wire this to your backend's reset endpoint.)</p>
        <input className="input" type="email" placeholder="you@example.com" value={fe} onChange={(e) => setFe(e.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setForgot(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => { if (!/^\S+@\S+\.\S+$/.test(fe)) return toast('Enter a valid email', 'error'); toast('Reset link sent (demo)'); setForgot(false); }}>Send link</button>
        </div>
      </Modal>
    </div>
  );
}
