// ─────────────────────────────────────────────────────────────
// CredChain — logged-out public chrome
// Shared header for the trust-infrastructure pages anyone can browse
// without an account (Registry, Equity Impact, public verification).
// ─────────────────────────────────────────────────────────────

import { Link, NavLink } from 'react-router-dom';

export default function PublicLayout({ children, fullBleed = false }) {
  const linkClass = ({ isActive }) =>
    `text-sm transition-colors duration-150 ${isActive ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-blue-600">Cred</span>
            <span className="text-gray-900">Chain</span>
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink to="/registry" className={linkClass}>Issuer Registry</NavLink>
            <NavLink to="/impact" className={linkClass}>Equity Impact</NavLink>
            <Link
              to="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      {fullBleed ? children : <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>}
    </div>
  );
}
