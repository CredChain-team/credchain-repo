// ─────────────────────────────────────────────────────────────
// CredChain Frontend — shared portal chrome (white + blue design system)
// Frosted top nav with brand + identity, a sticky left sidebar with an active
// pill indicator, and a horizontally-scrolling mobile tab strip. Portals pass
// `navItems`, `activeTab` and `onTabChange` to drive navigation; `children`
// renders the active tab content (capped to a comfortable reading width).
// ─────────────────────────────────────────────────────────────

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  student: 'bg-blue-50 text-blue-700 border-blue-200',
  employer: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  issuer: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function PortalLayout({
  title,
  subtitle,
  children,
  navItems = [],
  activeTab,
  onTabChange,
  credScore,
}) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const hasNav = navItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Frosted top nav */}
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-blue-600">Cred</span>
              <span className="text-gray-900">Chain</span>
            </span>
            {role && (
              <>
                <span className="mx-3 h-4 w-px bg-gray-200" />
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_BADGE[role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
                >
                  {role}
                </span>
              </>
            )}
            {role === 'student' && credScore ? (
              <>
                <span className="mx-3 h-4 w-px bg-gray-200" />
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  CredScore {credScore}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-gray-900">
                {user?.name || user?.email || 'CredChain user'}
              </p>
              {user?.credchainId && (
                <p className="font-mono text-[13px] leading-tight text-blue-600">{user.credchainId}</p>
              )}
            </div>
            <Link
              to="/admin"
              title="Platform admin (restricted)"
              className="hidden text-sm text-gray-400 transition-colors duration-150 hover:text-gray-600 sm:inline"
            >
              ⚙ Admin
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile tab strip */}
      {hasNav && (
        <nav className="sticky top-14 z-30 block border-b border-gray-200 bg-white sm:hidden">
          <div className="scrollbar-none flex gap-1 overflow-x-auto px-4 py-1">
            {navItems
              .filter((item) => !item.divider)
              .map((item) => {
                const active = item.key === activeTab;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabChange?.(item.key)}
                    className={[
                      'shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? '-mb-px border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700',
                    ].join(' ')}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
          </div>
        </nav>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop sidebar */}
        {hasNav && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white px-3 pt-5 sm:flex">
            <nav className="relative flex flex-col gap-1">
              {navItems.map((item, idx) =>
                item.divider ? (
                  <div key={`divider-${idx}`} className="my-2 h-px bg-gray-100" />
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabChange?.(item.key)}
                    className={[
                      'relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
                      item.key === activeTab
                        ? 'bg-blue-50 font-semibold text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    ].join(' ')}
                  >
                    {item.key === activeTab && (
                      <span className="absolute left-0 h-5 w-0.5 rounded-r bg-blue-600" />
                    )}
                    <span className="text-base leading-none">{item.icon}</span>
                    {item.label}
                  </button>
                )
              )}
            </nav>

            {user?.credchainId && (
              <div className="mb-4 mt-auto break-all rounded-xl bg-blue-50 p-3 text-[13px] font-mono leading-snug text-blue-700">
                {user.credchainId}
              </div>
            )}
          </aside>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-4xl">
            {(title || subtitle) && (
              <div className="mb-6">
                {title && <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm leading-relaxed text-gray-500">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
