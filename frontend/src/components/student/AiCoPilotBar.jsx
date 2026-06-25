// ─────────────────────────────────────────────────────────────
// CredChain — AI Co-Pilot Action Bar (Section 4.1)
//   "Generate Verified CV"   → Tony (:8001 via backend proxy) → PDF download.
//   "Sync Market Telemetry"  → Zhavia (:8002) → roleReadinessScore +
//                              marketEstimatedSalary (currency-aware by country).
// Only blockchain-verified credentials feed these — the backend enforces it.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { generateVerifiedCv, syncTelemetry } from '../../services/api';
import { formatSalary } from '../../lib/format';
import { getCountryModule } from '../../config/countryModules';

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
      setMsg({ type: 'ok', text: 'Verified CV generated from your on-chain credentials.' });
    } catch (err) {
      const status = err?.response?.status;
      setMsg({
        type: 'err',
        text: status === 409
          ? 'You need at least one blockchain-verified credential before generating a verified CV.'
          : 'The CV engine (:8001) is unreachable. Start it, then try again.',
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
      setMsg({ type: 'ok', text: 'Market telemetry synced.' });
    } catch {
      setMsg({ type: 'err', text: 'The Insights engine (:8002) is unreachable. Start it, then try again.' });
    } finally {
      setTelBusy(false);
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">AI Co-Pilot</h3>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
          Beta
        </span>
      </div>

      <button
        type="button"
        onClick={downloadCv}
        disabled={cvBusy}
        className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97] active:bg-blue-800 disabled:opacity-50"
      >
        {cvBusy ? 'Generating…' : '📄 Generate Verified CV'}
      </button>
      <button
        type="button"
        onClick={runTelemetry}
        disabled={telBusy}
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50"
      >
        {telBusy ? 'Syncing…' : '📈 Sync Market Telemetry'}
      </button>

      {msg && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in ${
            msg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="mt-0.5 shrink-0">{msg.type === 'ok' ? '✓' : '✕'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {telemetry && (
        <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-in">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 transition-colors duration-150 hover:bg-blue-100">
            <p className="text-lg font-bold tracking-tight text-blue-700">
              {telemetry.roleReadinessScore != null ? `${telemetry.roleReadinessScore}%` : '—'}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600">Role readiness</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 transition-colors duration-150 hover:bg-blue-100">
            <p className="text-lg font-bold tracking-tight text-blue-700">{formatSalary(telemetry.marketEstimatedSalary, currency)}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600">Market estimate</p>
          </div>
          {Array.isArray(telemetry.recommendedSkillGaps) && telemetry.recommendedSkillGaps.length > 0 && (
            <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600">Recommended next skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {telemetry.recommendedSkillGaps.map((g, i) => (
                  <span key={i} className="rounded-full border border-blue-200 bg-white px-2.5 py-0.5 text-xs font-medium text-blue-700">{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
