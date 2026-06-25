// ─────────────────────────────────────────────────────────────
// CredChain Frontend — unified auth screen (/login and /register)
//
// Primary path: "Sign in with Google" (the spec's unified OAuth flow),
// driven by the student / employer / issuer role toggle.
// Secondary path: email + password (the backend still supports it) — kept
// as a real, working fallback so the demo never hard-depends on Google
// credentials being configured.
//
// White + blue design system: two-column on desktop (gradient brand panel +
// auth card), single column on mobile.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister } from '../../services/api';
import { useAuth, PORTAL_HOME } from '../../context/AuthContext';
import GoogleSignInButton from './GoogleSignInButton';

const ROLES = [
  { key: 'student', label: 'Student' },
  { key: 'employer', label: 'Employer' },
  { key: 'issuer', label: 'Issuer' },
];

const PILLARS = [
  { icon: '🔐', text: 'Blockchain-anchored credentials' },
  { icon: '🌍', text: 'Verified globally, from any country' },
  { icon: '⚡', text: 'Instant verification — no 6-month wait' },
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

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel (desktop only) */}
      <div className="relative hidden flex-col items-start justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 px-12 py-16 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <span className="pointer-events-none absolute -bottom-8 -left-4 select-none text-[120px] font-extrabold leading-none text-white/5">
          C
        </span>

        <div className="relative">
          <h1 className="text-5xl font-extrabold tracking-tight text-white">CredChain</h1>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-blue-100">
            Trust infrastructure that doesn’t care how famous your school is.
          </p>

          <div className="mt-10 space-y-4">
            {PILLARS.map((p) => (
              <div
                key={p.text}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-blue-100"
              >
                <span className="text-base">{p.icon}</span>
                {p.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth column */}
      <div className="flex min-h-screen flex-1 items-center justify-center bg-white px-8 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span className="text-blue-600">Cred</span>
              <span className="text-gray-900">Chain</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isRegister ? 'Create your account' : 'Welcome back — sign in to your portal'}
            </p>
          </div>

          {/* Role toggle */}
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1">
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  aria-pressed={active}
                  className={[
                    'rounded-xl py-2.5 text-sm transition-all duration-150',
                    active
                      ? 'bg-white font-semibold text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Primary: Google */}
          <GoogleSignInButton
            role={role}
            label="Continue with Google"
          />

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with email</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Secondary: email/password */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {isRegister && (
              <input
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
                className={inputClass}
              />
            )}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={inputClass}
            />
            <input
              name="password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={inputClass}
            />

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in"
              >
                <span className="mt-0.5 shrink-0">✕</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97] active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Please wait…' : isRegister ? `Create ${role} account` : 'Sign in'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="mt-4 text-center text-sm text-gray-500">
            {isRegister ? (
              <>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to CredChain?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
