// ─────────────────────────────────────────────────────────────
// CredChain — Find your institution modal
// Backs the "From your school/employer" pathway button ("Check if my school is
// set up"). Pulls the PUBLIC issuer directory (verified issuers only, no risk /
// KYC fields) so a student can check whether their school already issues on
// CredChain. If it ISN'T listed, they can REQUEST it — the request is
// aggregated into a demand list for platform admins (see institutionController).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { Building2, Search, ShieldCheck, Loader2, MailQuestion, Send, CheckCircle2, PlusCircle } from 'lucide-react';
import { Modal, Input, Button, Badge, EmptyState } from '../ui';
import { getIssuerDirectory, requestInstitution } from '../../services/api';

export default function FindInstitutionModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [issuers, setIssuers] = useState([]);
  const [query, setQuery] = useState('');

  // Request-flow state.
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ institutionName: '', website: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, message, alreadyAvailable }
  const [formErr, setFormErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getIssuerDirectory();
        if (alive) setIssuers(res?.issuers || []);
      } catch {
        if (alive) setError('load-failed');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return issuers;
    return issuers.filter(
      (i) =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.lockedDomain || '').toLowerCase().includes(q) ||
        (i.institutionType || '').toLowerCase().includes(q)
    );
  }, [issuers, query]);

  // Open the request form, prefilling the name from whatever they searched.
  function openRequestForm() {
    setForm((f) => ({ ...f, institutionName: f.institutionName || query.trim() }));
    setResult(null);
    setFormErr(null);
    setShowForm(true);
  }

  async function submitRequest(e) {
    e.preventDefault();
    if (form.institutionName.trim().length < 2) {
      setFormErr('Please enter your institution’s name.');
      return;
    }
    setSubmitting(true);
    setFormErr(null);
    try {
      const res = await requestInstitution({
        institutionName: form.institutionName.trim(),
        website: form.website.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      setResult({ ok: true, message: res?.message, alreadyAvailable: res?.alreadyAvailable });
      setShowForm(false);
    } catch (err) {
      setFormErr(err?.response?.data?.message || 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Find your institution"
      description="Check whether your school or employer already issues verified credentials on CredChain — and if not, ask us to add them."
    >
      <div className="space-y-4">
        {/* Success banner after a request */}
        {result?.ok && (
          <div className="flex items-start gap-2 rounded-xl border border-accent-500/40 bg-accent-500/10 p-3.5 text-sm text-accent-600 dark:text-accent-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.message}</span>
          </div>
        )}

        {/* ── Request form ── */}
        {showForm ? (
          <form onSubmit={submitRequest} className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-soft p-4 dark:border-brand-500/30">
              <PlusCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <p className="text-sm text-content-secondary">
                Tell us which school or employer to invite. We count every student who asks — the more requests, the sooner we reach out.
              </p>
            </div>
            <Input
              label="Institution name"
              required
              value={form.institutionName}
              onChange={(e) => setForm((f) => ({ ...f, institutionName: e.target.value }))}
              placeholder="e.g. University of Lagos"
            />
            <Input
              label="Website or domain (optional)"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="e.g. unilag.edu.ng"
            />
            <Input
              label="Anything that helps us reach them? (optional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Faculty of Engineering, registrar's office"
            />
            {formErr && <p className="text-xs font-medium text-danger-500">{formErr}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={submitting} leftIcon={<Send className="h-4 w-4" />}>
                Submit request
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Back to search
              </Button>
            </div>
          </form>
        ) : (
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, domain, or type…"
              leftIcon={<Search className="h-4 w-4" />}
            />

            {loading ? (
              <div className="flex items-center justify-center gap-3 py-10">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                <span className="text-sm text-content-secondary">Loading the directory…</span>
              </div>
            ) : error ? (
              <EmptyState
                icon={MailQuestion}
                title="Couldn't load the directory"
                description="Please try again in a moment."
              />
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-strong bg-bg-sunken p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-elevated text-content-secondary">
                  <Building2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-content-primary">
                  {query ? `“${query}” isn’t on CredChain yet` : 'No verified institutions yet'}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-content-secondary">
                  We can invite them. Request your institution and we’ll reach out — your credentials will land straight in your vault once they join.
                </p>
                <Button className="mt-4" onClick={openRequestForm} leftIcon={<PlusCircle className="h-4 w-4" />}>
                  Request my institution
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((i) => (
                  <div
                    key={String(i.userId)}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-brand-soft text-brand-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-content-primary">{i.name}</p>
                        <p className="mt-0.5 truncate text-xs text-content-muted">
                          {i.institutionType || 'Institution'}{i.lockedDomain ? ` · ${i.lockedDomain}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge tone="success" variant="soft" size="sm" icon={<ShieldCheck />}>
                      Set up
                    </Badge>
                  </div>
                ))}
                <p className="pt-1 text-center text-xs text-content-muted">
                  A <span className="font-medium text-content-secondary">Set up</span> institution can send verified credentials straight to your vault.
                </p>
                {/* Can't find it even though the list is non-empty? Still let them ask. */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={openRequestForm}
                    className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline"
                  >
                    Don’t see your institution? Request it →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
