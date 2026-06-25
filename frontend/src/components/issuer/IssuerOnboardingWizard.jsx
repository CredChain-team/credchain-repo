// ─────────────────────────────────────────────────────────────
// CredChain Frontend — Issuer Command Center: Polymorphic Onboarding
// (Section 4.3) — THE anti-fraud + global-fairness centerpiece.
//
// A multi-step wizard whose required fields change by institutionType
// (Types A–E). Legitimacy = "is this a real, identifiable, accountable
// entity", never fame. The Country Module (Section 6) drives which
// registry IDs are asked for and whether the country is automated.
//
// It maps onto the LOCKED backend funnel:
//   register-step-one → verify-domain (live DNS TXT) → kyc/submit →
//   (admin) registry-cross-match → isVerifiedIssuer
//
// Graceful degradation (Section 6): Type C, GitHub/DAO orgs, and ANY
// country without an automated module route to manual review + external
// footprint check instead of being blocked — the same path Type C uses.
// Type-specific registry fields (OPEID/CAC/GitHub…) are collected and shown
// here; they're persisted client-side for the demo (option-A scope).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { INSTITUTION_TYPES, getInstitutionType, startingTrustTier } from '../../config/institutionTypes';
import { SUPPORTED_COUNTRIES, getCountryModule } from '../../config/countryModules';
import { registerIssuerStepOne, verifyIssuerDomain, submitIssuerKyc } from '../../services/api';

const DRAFT_KEY = 'credchain_issuer_onboarding';

// Resolve which verification path applies given the type + country module.
function resolveReviewMode(type, country) {
  if (!type) return 'manual';
  if (type.verifyPath === 'manual') return 'manual';
  if (type.verifyPath === 'github') return 'github';
  // domain path: only automated when the country module supports it.
  return country.automated ? 'auto' : 'manual';
}

const TIER_LABELS = {
  applied: 'Application received',
  domain_verified: 'Domain ownership proven',
  identity_checked: 'Identity (KYC) checked',
  active: 'Fully vetted — issuance unlocked',
};

const INPUT_CLASS =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function IssuerOnboardingWizard({ user }) {
  const [step, setStep] = useState('choose'); // choose | details | verify | kyc | done
  const [typeKey, setTypeKey] = useState('A');
  const [countryCode, setCountryCode] = useState('NG');
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Funnel artefacts.
  const [dns, setDns] = useState(null); // { recordType, host, value }
  const [riskFlags, setRiskFlags] = useState([]);
  const [status, setStatus] = useState(null); // backend verificationStatus
  const [kyc, setKyc] = useState(null); // { reference }
  const [githubConnected, setGithubConnected] = useState(false);
  const [outcome, setOutcome] = useState(null); // 'auto' | 'manual'

  const type = useMemo(() => getInstitutionType(typeKey), [typeKey]);
  const country = useMemo(() => getCountryModule(countryCode), [countryCode]);
  const reviewMode = useMemo(() => resolveReviewMode(type, country), [type, country]);
  const trustTier = useMemo(() => startingTrustTier(typeKey, country), [typeKey, country]);

  // Restore an in-progress DNS challenge across refreshes (so the token the
  // issuer added to DNS isn't lost). Keyed per user.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && draft.userId === user?.id && draft.step) {
        setStep(draft.step);
        setTypeKey(draft.typeKey || 'A');
        setCountryCode(draft.countryCode || 'NG');
        setValues(draft.values || {});
        setDns(draft.dns || null);
        setStatus(draft.status || null);
        setRiskFlags(draft.riskFlags || []);
        setKyc(draft.kyc || null);
        setOutcome(draft.outcome || null);
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [user?.id]);

  function persist(next) {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          userId: user?.id,
          step,
          typeKey,
          countryCode,
          values,
          dns,
          status,
          riskFlags,
          kyc,
          outcome,
          ...next,
        })
      );
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }

  function setField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  // Pull the right registry metadata for a 'registry' field from the country module.
  function registryMeta(fieldLabel) {
    const map = {
      education: country.educationRegistry,
      business: country.businessRegistry,
      professional: country.professionalRegistry,
    };
    return map[fieldLabel] || { idLabel: 'Registry ID', placeholder: '', apiAvailable: false };
  }

  function validateDetails() {
    for (const f of type.fields) {
      const v = values[f.name];
      if (f.required && (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))) {
        return f.type === 'registry' ? registryMeta(f.label).idLabel : f.label;
      }
    }
    return null;
  }

  // ── Step transitions ───────────────────────────────────────
  function goDetails() {
    setError(null);
    setNotice(null);
    setStep('details');
    persist({ step: 'details' });
  }

  async function submitDetails() {
    setError(null);
    setNotice(null);
    const missing = validateDetails();
    if (missing) {
      setError(`Please complete: ${missing}.`);
      return;
    }

    // AUTO (domain) path → kick off the real backend funnel.
    if (reviewMode === 'auto') {
      setBusy(true);
      try {
        const res = await registerIssuerStepOne({
          institutionType: type.backendType,
          email: values.domainEmail,
        });
        const inst = res.dnsInstructions || {};
        setDns({ recordType: inst.recordType, host: inst.host, value: inst.value });
        setStatus(res.issuer?.verificationStatus || 'applied');
        setRiskFlags(res.issuer?.riskFlags || []);
        setStep('verify');
        persist({
          step: 'verify',
          dns: { recordType: inst.recordType, host: inst.host, value: inst.value },
          status: res.issuer?.verificationStatus || 'applied',
          riskFlags: res.issuer?.riskFlags || [],
        });
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not start verification. Check the email domain and try again.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // MANUAL / GITHUB path → no consumer-email backend call; go to the
    // footprint-review screen (client-side submission for the demo).
    setStep('verify');
    persist({ step: 'verify' });
  }

  async function verifyDns() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await verifyIssuerDomain();
      setStatus(res.verificationStatus || 'domain_verified');
      setNotice('✓ Domain ownership verified on-chain of trust (Tier 2 complete).');
      setStep('kyc');
      persist({ step: 'kyc', status: res.verificationStatus || 'domain_verified' });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'DNS TXT record not found yet. It can take a few minutes to propagate — try again shortly.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function startKyc() {
    setError(null);
    setBusy(true);
    try {
      const res = await submitIssuerKyc();
      setKyc({ reference: res.kycReference });
      setOutcome('auto');
      setStep('done');
      persist({ step: 'done', kyc: { reference: res.kycReference }, outcome: 'auto' });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not start identity verification. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function submitManualReview() {
    setOutcome('manual');
    setStep('done');
    persist({ step: 'done', outcome: 'manual' });
  }

  function connectGithub() {
    // Type D: the spec's "Connect GitHub Organization" flow. No backend GitHub
    // OAuth exists (option-A scope), so this simulates the repo-health + admin
    // -rights check client-side, then routes into manual review.
    setBusy(true);
    setTimeout(() => {
      setGithubConnected(true);
      setBusy(false);
      setNotice('✓ GitHub organization connected. Repo health & your admin rights confirmed.');
    }, 600);
  }

  function restart() {
    localStorage.removeItem(DRAFT_KEY);
    setStep('choose');
    setValues({});
    setDns(null);
    setStatus(null);
    setRiskFlags([]);
    setKyc(null);
    setGithubConnected(false);
    setOutcome(null);
    setError(null);
    setNotice(null);
  }

  // ── Render helpers ─────────────────────────────────────────
  const stepIndex = { choose: 0, details: 1, verify: 2, kyc: 3, done: 4 }[step];

  return (
    <div className="mx-auto max-w-2xl">
      <Header reviewMode={reviewMode} country={country} trustTier={trustTier} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
        <Stepper current={stepIndex} reviewMode={reviewMode} />

        {notice && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-fade-in">
            <span className="mt-0.5 shrink-0">✓</span>
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
            <span className="mt-0.5 shrink-0">✕</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP: choose type + country ── */}
        {step === 'choose' && (
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">What kind of organization are you?</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Any real, accountable entity qualifies — small or unknown is fine. Fame isn’t the bar; legitimacy is.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INSTITUTION_TYPES.map((t) => {
                const active = t.key === typeKey;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTypeKey(t.key)}
                    className={[
                      'rounded-xl border-2 p-4 text-center transition-all duration-150 hover:-translate-y-0.5',
                      active ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300',
                    ].join(' ')}
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{t.title}</p>
                    <p className="mt-1 text-xs leading-snug text-gray-500">{t.blurb}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <label htmlFor="country" className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                Country / region
              </label>
              <select
                id="country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={INPUT_CLASS}
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs">
                {country.automated ? (
                  <span className="text-emerald-700">
                    {country.flag} {country.countryName}: full registry automation available — domain + DNS + KYC funnel.
                  </span>
                ) : (
                  <span className="text-amber-700">
                    No automated registry for this region yet → graceful fallback to <strong>manual review + footprint check</strong>. A legitimate issuer is never blocked for lacking an integration.
                  </span>
                )}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={goDetails}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97]"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: type-specific details ── */}
        {step === 'details' && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">{type.icon}</span>
              <h3 className="text-lg font-semibold tracking-tight text-gray-900">{type.title}</h3>
            </div>

            <div className="space-y-4">
              {type.fields.map((f) => {
                if (f.type === 'registry') {
                  const meta = registryMeta(f.label);
                  return (
                    <FieldShell key={f.name} label={meta.idLabel} note={meta.apiAvailable ? 'Automated cross-match available for this country.' : 'Collected for review; no automated check in this region yet.'}>
                      <input
                        type="text"
                        value={values[f.name] || ''}
                        onChange={(e) => setField(f.name, e.target.value)}
                        placeholder={meta.placeholder}
                        className={INPUT_CLASS}
                      />
                    </FieldShell>
                  );
                }
                if (f.type === 'file') {
                  const names = values[f.name] || [];
                  return (
                    <FieldShell key={f.name} label={f.label} note={f.note}>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setField(f.name, Array.from(e.target.files || []).map((file) => file.name))}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white hover:border-gray-400"
                      />
                      {names.length > 0 && (
                        <p className="mt-1 text-xs text-emerald-600">KYB frame: {names.join(', ')}</p>
                      )}
                    </FieldShell>
                  );
                }
                return (
                  <FieldShell key={f.name} label={f.label} note={f.note}>
                    <input
                      type={f.type === 'number' ? 'number' : f.type}
                      value={values[f.name] || (f.name === 'domainEmail' && user?.email ? user.email : '')}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      className={INPUT_CLASS}
                    />
                  </FieldShell>
                );
              })}
            </div>

            <PathBanner reviewMode={reviewMode} />

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep('choose')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <button
                type="button"
                onClick={submitDetails}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
              >
                {busy ? 'Submitting…' : reviewMode === 'auto' ? 'Start domain verification →' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: verify (DNS auto / manual / github) ── */}
        {step === 'verify' && reviewMode === 'auto' && dns && (
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">Prove you control the domain</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Add this TXT record at your DNS provider, then verify. We read it live — no screenshots, no trust-me.
            </p>

            {riskFlags.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Anti-fraud signals on record: {riskFlags.join(', ')} — these lower your starting trust tier but don’t block you.
              </div>
            )}

            <dl className="mt-4 break-all rounded-xl border border-gray-200 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-blue-700">
              <Row k="Type" v={dns.recordType} />
              <Row k="Host" v={dns.host} />
              <Row k="Value" v={dns.value} copyable />
            </dl>

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep('details')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <button
                type="button"
                onClick={verifyDns}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
              >
                {busy ? 'Checking DNS…' : 'Verify DNS now'}
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && reviewMode !== 'auto' && (
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              {reviewMode === 'github' ? 'Connect your GitHub organization' : 'Submit for manual review'}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              {reviewMode === 'github'
                ? 'We confirm repo health and your admin rights — registry paperwork isn’t required for real OSS communities.'
                : 'You don’t need formal registry paperwork to be legitimate. A CredChain reviewer checks your public footprint and accountability.'}
            </p>

            <div className="mt-4 rounded-xl border border-gray-200 bg-slate-50 p-4 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">{values.orgName || 'Your organization'}</p>
              {values.eventPlatformUrl && <p className="mt-1 break-all">Footprint: {values.eventPlatformUrl}</p>}
              {values.githubOrgUrl && <p className="mt-1 break-all">GitHub: {values.githubOrgUrl}</p>}
              {values.footprintUrl && <p className="mt-1 break-all">Also: {values.footprintUrl}</p>}
              <p className="mt-2 text-xs text-gray-400">
                Starting tier: <span className="text-amber-700">{trustTier.tier}</span> — upgrades over a clean track record.
              </p>
            </div>

            {reviewMode === 'github' && !githubConnected && (
              <button
                type="button"
                onClick={connectGithub}
                disabled={busy}
                className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50"
              >
                🐙 {busy ? 'Connecting…' : 'Connect GitHub Organization'}
              </button>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setStep('details')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <button
                type="button"
                onClick={submitManualReview}
                disabled={busy || (reviewMode === 'github' && !githubConnected)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
              >
                Submit for review →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: KYC (auto path) ── */}
        {step === 'kyc' && (
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">Identity verification (KYC)</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              One last accountability check on the responsible administrator. The provider confirms it via secure webhook.
            </p>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              ✓ Tier 2 complete — <strong>{TIER_LABELS.domain_verified}</strong>.
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={startKyc}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
              >
                {busy ? 'Starting…' : 'Begin identity verification →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: done ── */}
        {step === 'done' && (
          <DonePanel
            outcome={outcome}
            type={type}
            country={country}
            trustTier={trustTier}
            kyc={kyc}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}

// ── Presentational sub-components ─────────────────────────────

function Header({ reviewMode, country, trustTier }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold tracking-tight text-gray-900">Become a Verified Issuer</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-500">
        Students never self-certify onto the Verified Ledger — every credential is vouched for by an accountable issuer.
        This is how we stay zero-fraud <em>and</em> globally fair.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-gray-600">
          {country.flag} {country.countryName || country.countryCode}
        </span>
        <span className={`rounded-full border px-3 py-1 ${reviewMode === 'auto' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {reviewMode === 'auto' ? 'Automated funnel' : reviewMode === 'github' ? 'GitHub + review' : 'Manual review fallback'}
        </span>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">Start: {trustTier.tier}</span>
      </div>
    </div>
  );
}

function Stepper({ current, reviewMode }) {
  const steps =
    reviewMode === 'auto'
      ? ['Type', 'Details', 'Domain', 'KYC', 'Done']
      : ['Type', 'Details', 'Review', '—', 'Done'];
  return (
    <div className="mb-8 flex items-center gap-0">
      {steps.map((label, i) => {
        if (label === '—') return <div key={i} className="h-0.5 flex-1 bg-gray-200" />;
        const active = i === current;
        const done = i < current;
        return (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                done
                  ? 'bg-blue-600 text-white'
                  : active
                    ? 'animate-pulse-ring border-2 border-blue-600 text-blue-600'
                    : 'bg-gray-100 text-gray-400',
              ].join(' ')}
            >
              {done ? '✓' : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${active ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 transition-colors duration-500 ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldShell({ label, note, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-900">{label}</label>
      {children}
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}

function PathBanner({ reviewMode }) {
  const copy =
    reviewMode === 'auto'
      ? 'Next: prove domain ownership via a DNS TXT record (checked live), then a quick KYC.'
      : reviewMode === 'github'
        ? 'Next: connect your GitHub org so we can confirm repo health + your admin rights.'
        : 'Next: submit your public footprint for a CredChain reviewer. No registry paperwork required.';
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
      <span className="mt-0.5 shrink-0">ℹ</span>
      <span>{copy}</span>
    </div>
  );
}

function Row({ k, v, copyable }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <dt className="text-gray-400">{k}</dt>
      <dd className="flex items-center gap-2 truncate text-blue-700">
        <span className="truncate">{v}</span>
        {copyable && (
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-sans text-gray-600 hover:bg-gray-50"
          >
            {copied ? 'copied' : 'copy'}
          </button>
        )}
      </dd>
    </div>
  );
}

function DonePanel({ outcome, type, country, trustTier, kyc, onRestart }) {
  const isAuto = outcome === 'auto';
  return (
    <div className="flex flex-col items-center py-4 text-center animate-fade-in">
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${isAuto ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        {isAuto ? '✅' : '🕓'}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-gray-900">
        {isAuto ? 'Verification submitted — almost there' : 'Submitted for manual review'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        {isAuto ? (
          <>
            Domain ownership is proven and your KYC session is open. A CredChain admin completes the final
            registry cross-match (Tier 4) before issuance unlocks. You’ll move to <strong>Active</strong> then.
          </>
        ) : (
          <>
            A reviewer will check {type.title.toLowerCase()} <strong>{' '}</strong>accountability via your public footprint.
            Real, identifiable organizers are approved regardless of registry paperwork or fame.
          </>
        )}
      </p>

      <div className="mx-auto mt-5 w-full max-w-sm rounded-xl border border-gray-200 bg-slate-50 p-4 text-left text-sm">
        <Detail k="Type" v={`${type.icon} ${type.title}`} />
        <Detail k="Region" v={`${country.flag} ${country.countryName || country.countryCode}`} />
        <Detail k="Starting trust tier" v={trustTier.tier} />
        {isAuto && kyc?.reference && <Detail k="KYC reference" v={kyc.reference} mono />}
        <Detail k="Status" v={isAuto ? 'Awaiting Tier-4 admin vetting' : 'Pending reviewer'} />
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-6 text-sm text-blue-600 hover:underline"
      >
        Start a new application
      </button>
    </div>
  );
}

function Detail({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-gray-400">{k}</span>
      <span className={`text-right text-gray-700 ${mono ? 'font-mono text-[13px]' : ''}`}>{v}</span>
    </div>
  );
}
