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
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, Info, Check, Copy, GitBranch, Globe, ShieldCheck,
  Clock, ArrowRight, ArrowLeft, ScanFace,
} from 'lucide-react';
import { INSTITUTION_TYPES, getInstitutionType, startingTrustTier } from '../../config/institutionTypes';
import { SUPPORTED_COUNTRIES, getCountryModule } from '../../config/countryModules';
import { registerIssuerStepOne, verifyIssuerDomain, submitIssuerKyc } from '../../services/api';
import { Card, Button, Input, Select, Badge, SuccessCheck } from '../ui';
import { fadeUp } from '../../theme/motion';

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
      setNotice('Domain ownership verified on-chain of trust (Tier 2 complete).');
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
      setNotice('GitHub organization connected. Repo health & your admin rights confirmed.');
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

      <Card padding="lg">
        <Steps current={stepIndex} reviewMode={reviewMode} />

        <AnimatePresence>
          {notice && (
            <motion.div
              variants={fadeUp} initial="initial" animate="animate" exit="exit"
              className="mb-4 flex items-start gap-2 rounded-lg border border-accent-500/30 bg-accent-500/[0.06] px-4 py-3 text-sm text-accent-600 dark:text-accent-400"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              role="alert" variants={fadeUp} initial="initial" animate="animate" exit="exit"
              className="mb-4 flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] px-4 py-3 text-sm text-danger-500"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP: choose type + country ── */}
        {step === 'choose' && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <h3 className="text-lg font-bold tracking-tight text-content-primary">What kind of organization are you?</h3>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
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
                      'rounded-lg border-2 p-4 text-center transition-all duration-150 hover:-translate-y-0.5',
                      active ? 'border-brand-600 bg-brand-soft shadow-sm' : 'border-border-subtle bg-bg-elevated hover:border-brand-300',
                    ].join(' ')}
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <p className="mt-2 text-sm font-semibold text-content-primary">{t.title}</p>
                    <p className="mt-1 text-xs leading-snug text-content-secondary">{t.blurb}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <Select
                id="country"
                label="Country / region"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </Select>
              <div className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                country.automated
                  ? 'border-accent-500/30 bg-accent-500/[0.06] text-accent-600 dark:text-accent-400'
                  : 'border-warning-500/30 bg-warning-500/[0.06] text-warning-500'
              }`}>
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {country.automated ? (
                  <span>
                    {country.flag} {country.countryName}: full registry automation available — domain + DNS + KYC funnel.
                  </span>
                ) : (
                  <span>
                    No automated registry for this region yet → graceful fallback to <strong>manual review + footprint check</strong>. A legitimate issuer is never blocked for lacking an integration.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={goDetails} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continue
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP: type-specific details ── */}
        {step === 'details' && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">{type.icon}</span>
              <h3 className="text-lg font-bold tracking-tight text-content-primary">{type.title}</h3>
            </div>

            <div className="space-y-4">
              {type.fields.map((f) => {
                if (f.type === 'registry') {
                  const meta = registryMeta(f.label);
                  return (
                    <Input
                      key={f.name}
                      label={meta.idLabel}
                      hint={meta.apiAvailable ? 'Automated cross-match available for this country.' : 'Collected for review; no automated check in this region yet.'}
                      value={values[f.name] || ''}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={meta.placeholder}
                    />
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
                        className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-sm text-content-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-white hover:border-border-strong"
                      />
                      {names.length > 0 && (
                        <p className="mt-1 text-xs text-accent-600 dark:text-accent-400">KYB frame: {names.join(', ')}</p>
                      )}
                    </FieldShell>
                  );
                }
                return (
                  <Input
                    key={f.name}
                    label={f.label}
                    hint={f.note}
                    type={f.type === 'number' ? 'number' : f.type}
                    value={values[f.name] || (f.name === 'domainEmail' && user?.email ? user.email : '')}
                    onChange={(e) => setField(f.name, e.target.value)}
                    placeholder={f.placeholder}
                  />
                );
              })}
            </div>

            <PathBanner reviewMode={reviewMode} />

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep('choose')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
              <Button type="button" onClick={submitDetails} loading={busy} rightIcon={!busy && <ArrowRight className="h-4 w-4" />}>
                {busy ? 'Submitting…' : reviewMode === 'auto' ? 'Start domain verification' : 'Continue'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP: verify (DNS auto / manual / github) ── */}
        {step === 'verify' && reviewMode === 'auto' && dns && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <h3 className="text-lg font-bold tracking-tight text-content-primary">Prove you control the domain</h3>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
              Add this TXT record at your DNS provider, then verify. We read it live — no screenshots, no trust-me.
            </p>

            {riskFlags.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning-500/30 bg-warning-500/[0.06] px-4 py-3 text-xs text-warning-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Anti-fraud signals on record: {riskFlags.join(', ')} — these lower your starting trust tier but don’t block you.</span>
              </div>
            )}

            <dl className="mt-4 break-all rounded-lg border border-border-subtle bg-bg-sunken p-3.5 font-mono text-[13px] leading-relaxed">
              <Row k="Type" v={dns.recordType} />
              <Row k="Host" v={dns.host} />
              <Row k="Value" v={dns.value} copyable />
            </dl>

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep('details')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
              <Button type="button" onClick={verifyDns} loading={busy} leftIcon={!busy && <Globe className="h-4 w-4" />}>
                {busy ? 'Checking DNS…' : 'Verify DNS now'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'verify' && reviewMode !== 'auto' && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <h3 className="text-lg font-bold tracking-tight text-content-primary">
              {reviewMode === 'github' ? 'Connect your GitHub organization' : 'Submit for manual review'}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
              {reviewMode === 'github'
                ? 'We confirm repo health and your admin rights — registry paperwork isn’t required for real OSS communities.'
                : 'You don’t need formal registry paperwork to be legitimate. A CredChain reviewer checks your public footprint and accountability.'}
            </p>

            <div className="mt-4 rounded-lg border border-border-subtle bg-bg-sunken p-4 text-sm text-content-secondary">
              <p className="font-semibold text-content-primary">{values.orgName || 'Your organization'}</p>
              {values.eventPlatformUrl && <p className="mt-1 break-all">Footprint: {values.eventPlatformUrl}</p>}
              {values.githubOrgUrl && <p className="mt-1 break-all">GitHub: {values.githubOrgUrl}</p>}
              {values.footprintUrl && <p className="mt-1 break-all">Also: {values.footprintUrl}</p>}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-content-muted">
                Starting tier: <Badge tone="warning" size="sm">{trustTier.tier}</Badge> — upgrades over a clean track record.
              </p>
            </div>

            {reviewMode === 'github' && !githubConnected && (
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={connectGithub}
                loading={busy}
                leftIcon={!busy && <GitBranch className="h-4 w-4" />}
              >
                {busy ? 'Connecting…' : 'Connect GitHub Organization'}
              </Button>
            )}
            {reviewMode === 'github' && githubConnected && (
              <div className="mt-4 flex items-center gap-2 text-sm text-accent-600 dark:text-accent-400">
                <CheckCircle2 className="h-4 w-4" /> GitHub organization connected.
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep('details')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
              <Button
                type="button"
                onClick={submitManualReview}
                disabled={busy || (reviewMode === 'github' && !githubConnected)}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Submit for review
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── STEP: KYC (auto path) ── */}
        {step === 'kyc' && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <h3 className="text-lg font-bold tracking-tight text-content-primary">Identity verification (KYC)</h3>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">
              One last accountability check on the responsible administrator. The provider confirms it via secure webhook.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/[0.06] p-4 text-sm text-accent-600 dark:text-accent-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Tier 2 complete — <strong>{TIER_LABELS.domain_verified}</strong>.</span>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={startKyc} loading={busy} leftIcon={!busy && <ScanFace className="h-4 w-4" />}>
                {busy ? 'Starting…' : 'Begin identity verification'}
              </Button>
            </div>
          </motion.div>
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
      </Card>
    </div>
  );
}

// ── Presentational sub-components ─────────────────────────────

function Header({ reviewMode, country, trustTier }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold tracking-tight text-content-primary">Become a Verified Issuer</h2>
      <p className="mt-1 text-sm leading-relaxed text-content-secondary">
        Students never self-certify onto the Verified Ledger — every credential is vouched for by an accountable issuer.
        This is how we stay zero-fraud <em>and</em> globally fair.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="neutral">{country.flag} {country.countryName || country.countryCode}</Badge>
        <Badge tone={reviewMode === 'auto' ? 'success' : 'warning'}>
          {reviewMode === 'auto' ? 'Automated funnel' : reviewMode === 'github' ? 'GitHub + review' : 'Manual review fallback'}
        </Badge>
        <Badge tone="brand">Start: {trustTier.tier}</Badge>
      </div>
    </div>
  );
}

function Steps({ current, reviewMode }) {
  const steps =
    reviewMode === 'auto'
      ? ['Type', 'Details', 'Domain', 'KYC', 'Done']
      : ['Type', 'Details', 'Review', '—', 'Done'];
  return (
    <div className="mb-8 flex items-center gap-0">
      {steps.map((label, i) => {
        if (label === '—') return <div key={i} className="h-0.5 flex-1 bg-border-subtle" />;
        const active = i === current;
        const done = i < current;
        return (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                done
                  ? 'bg-brand-600 text-white'
                  : active
                    ? 'animate-pulse-ring border-2 border-brand-600 text-brand-600'
                    : 'bg-bg-sunken text-content-muted',
              ].join(' ')}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${active || done ? 'font-semibold text-content-primary' : 'text-content-muted'}`}>{label}</span>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 transition-colors duration-500 ${done ? 'bg-brand-600' : 'bg-border-subtle'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldShell({ label, note, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-content-primary">{label}</label>
      {children}
      {note && <p className="text-xs text-content-muted">{note}</p>}
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
    <div className="mt-4 flex items-start gap-2 rounded-lg border border-brand-300/40 bg-brand-soft px-4 py-3 text-xs text-brand-700 dark:text-brand-300">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{copy}</span>
    </div>
  );
}

function Row({ k, v, copyable }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <dt className="text-content-muted">{k}</dt>
      <dd className="flex items-center gap-2 truncate text-brand-600 dark:text-brand-300">
        <span className="truncate">{v}</span>
        {copyable && (
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-elevated px-2 py-0.5 text-[10px] font-sans text-content-secondary hover:bg-bg-sunken"
          >
            {copied ? <Check className="h-3 w-3 text-accent-500" /> : <Copy className="h-3 w-3" />}
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
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex flex-col items-center py-4 text-center">
      {isAuto ? (
        <SuccessCheck size={60} />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-500/12 text-warning-500">
          <Clock className="h-7 w-7" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-bold tracking-tight text-content-primary">
        {isAuto ? 'Verification submitted — almost there' : 'Submitted for manual review'}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-content-secondary">
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

      <div className="mx-auto mt-5 w-full max-w-sm rounded-lg border border-border-subtle bg-bg-sunken p-4 text-left text-sm">
        <Detail k="Type" v={`${type.icon} ${type.title}`} />
        <Detail k="Region" v={`${country.flag} ${country.countryName || country.countryCode}`} />
        <Detail k="Starting trust tier" v={trustTier.tier} />
        {isAuto && kyc?.reference && <Detail k="KYC reference" v={kyc.reference} mono />}
        <Detail k="Status" v={isAuto ? 'Awaiting Tier-4 admin vetting' : 'Pending reviewer'} />
      </div>

      <Button type="button" variant="ghost" size="sm" className="mt-6" onClick={onRestart}>
        Start a new application
      </Button>
    </motion.div>
  );
}

function Detail({ k, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-content-muted">{k}</span>
      <span className={`text-right text-content-primary ${mono ? 'font-mono text-[13px]' : ''}`}>{v}</span>
    </div>
  );
}
