// ─────────────────────────────────────────────────────────────
// CredChain — AI Co-Pilot Action Bar (Section 4.1)
//   "Generate Verified CV"   → Tony (:8001 via backend proxy) → PDF download.
//   "Sync Market Telemetry"  → Zhavia (:8002) → roleReadinessScore +
//                              marketEstimatedSalary (currency-aware by country).
// Only blockchain-verified credentials feed these — the backend enforces it.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, FileText, TrendingUp, CheckCircle2, XCircle,
} from 'lucide-react';
import { generateVerifiedCv, syncTelemetry } from '../../services/api';
import { formatSalary } from '../../lib/format';
import { getCountryModule } from '../../config/countryModules';
import { Card, Badge, Button } from '../ui';
import { fadeUp } from '../../theme/motion';

export default function AiCoPilotBar({ userId, countryCode = 'NG', telemetry, onTelemetry }) {
  const [cvBusy, setCvBusy] = useState(false);
  const [telBusy, setTelBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const currency = getCountryModule(countryCode).currency;

  async function downloadCv() {
    setCvBusy(true);
    setMsg(null);
    try {
      const blob = await generateVerifiedCv({ userId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credchain-verified-cv.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ type: 'ok', text: 'Your verified CV is ready, built from your verified skills.' });
    } catch (err) {
      const status = err?.response?.status;
      setMsg({
        type: 'err',
        text: status === 409
          ? 'You need at least one verified skill before we can build your verified CV.'
          : "The CV tool isn't responding right now. Try again in a moment.",
      });
    } finally {
      setCvBusy(false);
    }
  }

  async function runTelemetry() {
    setTelBusy(true);
    setMsg(null);
    try {
      const res = await syncTelemetry({ userId });
      if (res?.aiTelemetry && onTelemetry) onTelemetry(res.aiTelemetry);
      setMsg({ type: 'ok', text: 'Job-market insights updated.' });
    } catch {
      setMsg({ type: 'err', text: "The insights tool isn't responding right now. Try again in a moment." });
    } finally {
      setTelBusy(false);
    }
  }

  return (
    <Card padding="lg" className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-content-primary">AI helper</h3>
            <p className="text-[11px] text-content-muted">Build a CV and check your job-market fit</p>
          </div>
        </div>
        <Badge tone="brand" variant="soft" size="sm">Beta</Badge>
      </div>

      <Button fullWidth loading={cvBusy} onClick={downloadCv} leftIcon={!cvBusy && <FileText className="h-4 w-4" />}>
        {cvBusy ? 'Building…' : 'Build my verified CV'}
      </Button>
      <Button fullWidth variant="secondary" className="mt-2" loading={telBusy} onClick={runTelemetry} leftIcon={!telBusy && <TrendingUp className="h-4 w-4" />}>
        {telBusy ? 'Checking…' : 'Check my job-market fit'}
      </Button>

      {msg && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
            msg.type === 'ok'
              ? 'border-accent-500/30 bg-accent-500/10 text-accent-600 dark:text-accent-400'
              : 'border-danger-500/30 bg-danger-500/10 text-danger-500'
          }`}
        >
          {msg.type === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {telemetry && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border-subtle bg-bg-brand-soft p-3">
            <p className="tnum text-lg font-bold tracking-tight text-brand-700 dark:text-brand-300">
              {telemetry.roleReadinessScore != null ? `${telemetry.roleReadinessScore}%` : '—'}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-content-muted">Role readiness</p>
          </div>
          <div className="rounded-md border border-border-subtle bg-bg-brand-soft p-3">
            <p className="tnum text-lg font-bold tracking-tight text-brand-700 dark:text-brand-300">{formatSalary(telemetry.marketEstimatedSalary, currency)}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-content-muted">Market estimate</p>
          </div>
          {Array.isArray(telemetry.recommendedSkillGaps) && telemetry.recommendedSkillGaps.length > 0 && (
            <div className="col-span-2 rounded-md border border-border-subtle bg-bg-sunken p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-content-muted">Recommended next skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {telemetry.recommendedSkillGaps.map((g, i) => (
                  <Badge key={i} tone="brand" variant="soft" size="sm">{g}</Badge>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </Card>
  );
}
