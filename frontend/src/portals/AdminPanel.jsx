// ─────────────────────────────────────────────────────────────
// CredChain — Platform Admin Panel
// The gatekeeper console: Overview, Issuer Vetting (Tier-4 registry
// cross-match that unlocks issuance), and the independent Dispute queue.
// API is gated to ADMIN_EMAILS; non-admins get a clear notice.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Building2, Gavel, ShieldAlert, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import PortalLayout from './PortalLayout';
import { getAdminIssuers, registryCrossMatch, listDisputes, resolveDispute } from '../services/api';
import AdminOverview from '../components/admin/AdminOverview';
import IssuerVetting from '../components/admin/IssuerVetting';
import DisputeQueue from '../components/admin/DisputeQueue';
import { Card, Badge, Tabs } from '../components/ui';
import { fadeUp } from '../theme/motion';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'issuers', label: 'Issuer Vetting' },
  { key: 'disputes', label: 'Disputes' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('overview');
  const [issuers, setIssuers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | forbidden | error
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [iss, dis] = await Promise.allSettled([getAdminIssuers(), listDisputes()]);
    const forbidden =
      iss.status === 'rejected' && iss.reason?.response?.status === 403 &&
      dis.status === 'rejected' && dis.reason?.response?.status === 403;
    if (forbidden) {
      setState('forbidden');
      return;
    }
    if (iss.status === 'fulfilled') setIssuers(iss.value?.issuers || []);
    if (dis.status === 'fulfilled') setDisputes(dis.value?.disputes || []);
    if (iss.status === 'rejected' && dis.status === 'rejected') {
      setState('error');
    } else {
      setState('ready');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function vet(userId, matched) {
    setMsg(null);
    try {
      const res = await registryCrossMatch(userId, matched);
      setMsg({ type: 'ok', text: res?.message || 'Issuer updated.' });
      await load();
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'Vetting action failed.' });
    }
  }

  async function resolve(id, decision) {
    setMsg(null);
    try {
      const res = await resolveDispute(id, decision);
      setMsg({ type: 'ok', text: res?.message || 'Resolved.' });
      setDisputes((prev) => prev.filter((d) => String(d.id) !== String(id)));
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'Could not resolve.' });
    }
  }

  const tabItems = [
    { value: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
    { value: 'issuers', label: 'Issuer Vetting', icon: <Building2 /> },
    { value: 'disputes', label: 'Disputes', icon: <Gavel />, count: disputes.length || undefined },
  ];

  return (
    <PortalLayout title="Platform Admin" subtitle="Vet issuers and resolve disputes — the independent backstop of the trust network.">
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-content-secondary">Loading admin console…</span>
        </div>
      )}

      {state === 'forbidden' && (
        <Card padding="lg" className="border-warning-500/30 bg-warning-500/[0.06]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-500" />
            <div>
              <p className="font-bold text-content-primary">Admins only</p>
              <p className="mt-1 text-sm leading-relaxed text-content-secondary">
                This console is restricted to the <code className="rounded bg-bg-sunken px-1 font-mono text-[13px]">ADMIN_EMAILS</code> allowlist in the backend <code className="rounded bg-bg-sunken px-1 font-mono text-[13px]">.env</code>.
                Add your account’s email there (comma-separated) and sign in with it to vet issuers and resolve disputes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {state === 'error' && (
        <Card padding="lg" className="text-center text-danger-500">Failed to load the admin console.</Card>
      )}

      {state === 'ready' && (
        <>
          <div className="mb-6 flex items-center gap-3">
            <Badge tone="danger" variant="soft" icon={<ShieldAlert />}>Admin Panel</Badge>
          </div>

          <Tabs tabs={tabItems} value={tab} onChange={setTab} className="mb-6 max-w-md" />

          <AnimatePresence mode="wait">
            {msg && (
              <motion.div
                key={msg.text}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                  msg.type === 'ok'
                    ? 'border-accent-500/30 bg-accent-500/[0.08] text-accent-600 dark:text-accent-400'
                    : 'border-danger-500/30 bg-danger-500/[0.08] text-danger-500'
                }`}
              >
                <span className="mt-0.5 shrink-0">{msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span>
                <span>{msg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div key={tab} variants={fadeUp} initial="initial" animate="animate">
            {tab === 'overview' && <AdminOverview issuers={issuers} disputes={disputes} onGoTo={setTab} />}
            {tab === 'issuers' && <IssuerVetting issuers={issuers} onVet={vet} />}
            {tab === 'disputes' && <DisputeQueue disputes={disputes} onResolve={resolve} />}
          </motion.div>
        </>
      )}
    </PortalLayout>
  );
}
