// ─────────────────────────────────────────────────────────────
// CredChain — shared portal shell (design-system v2)
// Same props API as before: { title, subtitle, navItems, activeTab,
// onTabChange, credScore, children }. navItems: { key, label, icon, divider }.
// Adds: light/dark, collapsible sidebar, mobile drawer, theme toggle,
// avatar menu, animated active pill + page transitions.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Settings, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import ThemeToggle from '../components/ui/ThemeToggle';

const ROLE_TONE = { student: 'brand', employer: 'violet', issuer: 'warning', admin: 'danger' };

function NavList({ items, activeTab, onTabChange, collapsed }) {
  return (
    <nav className="relative flex flex-col gap-1">
      {items.map((item, idx) =>
        item.divider ? (
          <div key={`divider-${idx}`} className="my-2 h-px bg-border-subtle" />
        ) : (
          <button
            key={item.key}
            type="button"
            title={collapsed ? item.label : undefined}
            onClick={() => onTabChange?.(item.key)}
            className={[
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              collapsed ? 'justify-center' : '',
              item.key === activeTab
                ? 'bg-brand-soft font-semibold text-brand-700 dark:text-brand-300'
                : 'text-content-secondary hover:bg-bg-sunken hover:text-content-primary',
            ].join(' ')}
          >
            {item.key === activeTab && (
              <motion.span layoutId="nav-active-bar" className="absolute left-0 h-5 w-0.5 rounded-r bg-brand-600" />
            )}
            <span className="text-base leading-none">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        )
      )}
    </nav>
  );
}

export default function PortalLayout({ title, subtitle, children, navItems = [], activeTab, onTabChange, credScore }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const hasNav = navItems.filter((i) => !i.divider).length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      {/* Topbar */}
      <header className="glass sticky top-0 z-40 border-b border-border-subtle">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {hasNav && (
              <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-content-secondary hover:bg-bg-sunken lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Link to="/" className="text-xl font-black tracking-tight">
              <span className="text-brand-600">Cred</span>
              <span className="text-content-primary">Chain</span>
            </Link>
            {role && <Badge tone={ROLE_TONE[role] || 'neutral'} variant="soft" className="hidden capitalize sm:inline-flex">{role}</Badge>}
            {role === 'student' && credScore ? (
              <Badge tone="success" variant="soft" className={`hidden tabular-nums md:inline-flex ${credScore >= 600 ? 'animate-pulse-ring' : ''}`}>CredScore {credScore}</Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-bg-sunken">
                <Avatar name={user?.name || user?.email || 'User'} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight text-content-primary">{user?.name || 'CredChain user'}</span>
                  {user?.credchainId && <span className="block font-mono text-[11px] leading-tight text-brand-600">{user.credchainId}</span>}
                </span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated p-1.5 shadow-lg"
                    >
                      <div className="px-3 py-2">
                        <p className="truncate text-sm font-semibold text-content-primary">{user?.email || user?.name}</p>
                        {user?.credchainId && <p className="truncate font-mono text-[11px] text-content-muted">{user.credchainId}</p>}
                      </div>
                      <div className="my-1 h-px bg-border-subtle" />
                      <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-content-secondary hover:bg-bg-sunken hover:text-content-primary">
                        <Settings className="h-4 w-4" /> Admin
                      </Link>
                      <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger-500 hover:bg-danger-500/10">
                        <LogOut className="h-4 w-4" /> Log out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        {hasNav && (
          <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border-subtle bg-bg-elevated px-3 pt-5 transition-[width] duration-200 lg:flex ${collapsed ? 'w-[72px]' : 'w-64'}`}>
            <NavList items={navItems} activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="mb-4 mt-auto flex items-center justify-center gap-2 rounded-lg border border-border-subtle py-2 text-xs font-medium text-content-muted hover:bg-bg-sunken"
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
              {!collapsed && 'Collapse'}
            </button>
          </aside>
        )}

        {/* Mobile drawer */}
        <AnimatePresence>
          {drawer && hasNav && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
              <motion.aside
                initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-bg-elevated px-3 pt-4"
              >
                <div className="mb-4 flex items-center justify-between px-2">
                  <span className="text-lg font-black"><span className="text-brand-600">Cred</span>Chain</span>
                  <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-bg-sunken"><X className="h-5 w-5" /></button>
                </div>
                <NavList items={navItems} activeTab={activeTab} onTabChange={(k) => { onTabChange?.(k); setDrawer(false); }} collapsed={false} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            {(title || subtitle) && (
              <div className="mb-6">
                {title && <h1 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm leading-relaxed text-content-secondary">{subtitle}</p>}
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
