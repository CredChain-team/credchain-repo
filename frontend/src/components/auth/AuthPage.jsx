// ─────────────────────────────────────────────────────────────
// CredChain — unified auth screen (/login and /register) — design v2.
// Logic unchanged: Google OAuth primary + email/password fallback,
// role toggle, AuthContext.login → portal redirect.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Globe, Zap, AlertCircle, ArrowRight } from 'lucide-react';
import { login as apiLogin, register as apiRegister } from '../../services/api';
import { useAuth, PORTAL_HOME } from '../../context/AuthContext';
import GoogleSignInButton from './GoogleSignInButton';
import { Input } from '../ui/Input';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';

const ROLES = [
  { key: 'student', label: 'Student' },
  { key: 'employer', label: 'Employer' },
  { key: 'issuer', label: 'Issuer' },
];

const PILLARS = [
  { icon: ShieldCheck, text: 'Blockchain-anchored credentials' },
  { icon: Globe, text: 'Verified globally, from any country' },
  { icon: Zap, text: 'Instant verification — no 6-month wait' },
];

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = isRegister
        ? { name: form.name, email: form.email, password: form.password, role }
        : { email: form.email, password: form.password };
      const data = isRegister ? await apiRegister(payload) : await apiLogin(payload);

      if (!data?.token) throw new Error('No token returned.');
      const resolved = login(data.token, data.user);
      const dest = PORTAL_HOME[resolved?.role] || PORTAL_HOME[role] || '/student';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (isRegister ? 'Registration failed. Please try again.' : 'Invalid email or password.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Left brand panel (desktop) */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-grad-brand px-12 py-16 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1px)] bg-[length:26px_26px]" />
        <span className="pointer-events-none absolute -bottom-10 -left-4 select-none text-[140px] font-black leading-none text-white/10">C</span>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="relative">
          <Link to="/" className="font-display text-5xl font-extrabold tracking-tight text-white">CredChain</Link>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/80">
            Trust infrastructure that doesn’t care how famous your school is.
          </p>
          <div className="mt-10 space-y-3">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.text}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 rounded-xl bg-white/12 px-4 py-3 text-sm font-medium text-white backdrop-blur"
              >
                <p.icon className="h-5 w-5 shrink-0 text-white" />
                {p.text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right auth column */}
      <div className="flex min-h-screen flex-1 items-center justify-center px-6 py-10">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="text-center">
            <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-brand-600">Cred</span><span className="text-content-primary">Chain</span>
            </Link>
            <p className="mt-1.5 text-sm text-content-secondary">
              {isRegister ? 'Create your account' : 'Welcome back — sign in to your portal'}
            </p>
          </div>

          {/* Role toggle */}
          <div className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-bg-sunken p-1">
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  aria-pressed={active}
                  className="relative rounded-lg py-2.5 text-sm font-semibold transition-colors"
                >
                  {active && (
                    <motion.span layoutId="role-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="absolute inset-0 rounded-lg bg-bg-elevated shadow-sm" />
                  )}
                  <span className={`relative z-10 ${active ? 'text-brand-700 dark:text-white' : 'text-content-secondary'}`}>{r.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <GoogleSignInButton role={role} label="Continue with Google" />
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border-subtle" />
            <span className="text-xs text-content-muted">or continue with email</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {isRegister && (
              <Input name="name" type="text" required value={form.name} onChange={handleChange} placeholder="Full name" />
            )}
            <Input name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" />
            <Input name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required value={form.password} onChange={handleChange} placeholder="••••••••" />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm font-medium text-danger-500"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg" rightIcon={!loading && <ArrowRight className="h-4 w-4" />} className="mt-2">
              {isRegister ? `Create ${role} account` : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-content-secondary">
            {isRegister ? (
              <>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link></>
            ) : (
              <>New to CredChain? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link></>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
