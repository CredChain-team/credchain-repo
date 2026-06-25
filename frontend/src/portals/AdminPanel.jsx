// ─────────────────────────────────────────────────────────────
// CredChain — Platform Admin Panel
// The gatekeeper console: Overview, Issuer Vetting (Tier-4 registry
// cross-match that unlocks issuance), and the independent Dispute queue.
// API is gated to ADMIN_EMAILS; non-admins get a clear notice.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import PortalLayout from './PortalLayout';
import { getAdminIssuers, registryCrossMatch, listDisputes, resolveDispute } from '../services/api';
import AdminOverview from '../components/admin/AdminOverview';
import IssuerVetting from '../components/admin/IssuerVetting';
import DisputeQueue from '../components/admin/DisputeQueue';

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

  return (
    <PortalLayout title="Platform Admin" subtitle="Vet issuers and resolve disputes — the independent backstop of the trust network.">
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading admin console…</span>
        </div>
      )}

      {state === 'forbidden' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-semibold">Admins only</p>
          <p className="mt-1 text-sm leading-relaxed">
            This console is restricted to the <code className="font-mono text-[13px]">ADMIN_EMAILS</code> allowlist in the backend <code className="font-mono text-[13px]">.env</code>.
            Add your account’s email there (comma-separated) and sign in with it to vet issuers and resolve disputes.
          </p>
        </div>
      )}

      {state === 'error' && <p className="text-red-600">Failed to load the admin console.</p>}

      {state === 'ready' && (
        <>
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">Admin Panel</span>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${tab === t.key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                {t.label}
                {t.key === 'disputes' && disputes.length > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-700">{disputes.length}</span>}
              </button>
            ))}
          </div>

          {msg && (
            <div
              className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in ${
                msg.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <span className="mt-0.5 shrink-0">{msg.type === 'ok' ? '✓' : '✕'}</span>
              <span>{msg.text}</span>
            </div>
          )}

          <div key={tab} className="animate-fade-in">
            {tab === 'overview' && <AdminOverview issuers={issuers} disputes={disputes} onGoTo={setTab} />}
            {tab === 'issuers' && <IssuerVetting issuers={issuers} onVet={vet} />}
            {tab === 'disputes' && <DisputeQueue disputes={disputes} onResolve={resolve} />}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
