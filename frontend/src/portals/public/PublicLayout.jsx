// ─────────────────────────────────────────────────────────────
// CredChain — logged-out public chrome
// Shared header for the trust-infrastructure pages anyone can browse
// without an account (Registry, Equity Impact, public verification).
// ─────────────────────────────────────────────────────────────

import { Link, NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../../components/ui';

export default function PublicLayout({ children, fullBleed = false }) {
  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 ${
      isActive ? 'text-brand-600' : 'text-content-secondary hover:text-content-primary'
    }`;

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-elevated/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-verified text-white shadow-verified">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="text-brand-600">Cred</span>
              <span className="text-content-primary">Chain</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <NavLink to="/registry" className={linkClass}>Issuer Registry</NavLink>
            <NavLink to="/impact" className={linkClass}>Equity Impact</NavLink>
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-700 hover:shadow-brand active:scale-[0.97]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      {fullBleed ? children : <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>}
    </div>
  );
}
