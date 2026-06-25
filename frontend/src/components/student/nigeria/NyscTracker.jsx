// ─────────────────────────────────────────────────────────────
// CredChain — NYSC Pre-Validation Tracker
// Cross-references on-chain student data (matric, DOB, course, graduation
// date) against a MOCK "NYSC Senate List Matching Engine". Mismatches raise
// an amber warning months before the real Senate List is sent — catching
// the data errors that cause mobilization failures while there's still time.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '../../ui';
import { fadeUp } from '../../../theme/motion';

const KEY = 'credchain_nysc';

// Mock "on-chain record of truth" the Senate List engine compares against.
// In production this is derived from the anchored academic credential.
const ON_CHAIN_RECORD = {
  matric: 'UNN/2021/CSC/0184',
  dob: '2002-05-14',
  course: 'Computer Science',
  graduationDate: '2026-07-31',
};

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}

export default function NyscTracker() {
  const [form, setForm] = useState(() => loadDraft() || { matric: '', dob: '', course: '', graduationDate: '' });
  const [result, setResult] = useState(null);

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function runMatch(e) {
    e.preventDefault();
    const mismatches = [];
    if (form.matric.trim().toUpperCase() !== ON_CHAIN_RECORD.matric) mismatches.push({ field: 'Matric number', expected: ON_CHAIN_RECORD.matric, got: form.matric || '(blank)' });
    if (form.dob !== ON_CHAIN_RECORD.dob) mismatches.push({ field: 'Date of birth', expected: ON_CHAIN_RECORD.dob, got: form.dob || '(blank)' });
    if (form.course.trim().toLowerCase() !== ON_CHAIN_RECORD.course.toLowerCase()) mismatches.push({ field: 'Course', expected: ON_CHAIN_RECORD.course, got: form.course || '(blank)' });
    if (form.graduationDate !== ON_CHAIN_RECORD.graduationDate) mismatches.push({ field: 'Graduation date', expected: ON_CHAIN_RECORD.graduationDate, got: form.graduationDate || '(blank)' });

    try { localStorage.setItem(KEY, JSON.stringify(form)); } catch { /* ignore */ }
    setResult({ ok: mismatches.length === 0, mismatches });
  }

  function prefillFromRecord() {
    setForm({ ...ON_CHAIN_RECORD });
    setResult(null);
  }

  return (
    <motion.div {...fadeUp}>
      <Card className="border-info-500/30 bg-info-500/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-500/15 text-info-500">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-content-primary">NYSC Pre-Validation</h2>
          </div>
          <button type="button" onClick={prefillFromRecord} className="text-xs font-medium text-info-500 hover:underline">Use my on-chain record</button>
        </div>
        <p className="mt-2 text-xs text-content-secondary">Catch Senate-List data mismatches now — not after mobilization fails.</p>

        <form onSubmit={runMatch} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Matric number" value={form.matric} onChange={(v) => set('matric', v)} placeholder="UNN/2021/CSC/0184" />
          <Field label="Date of birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
          <Field label="Course" value={form.course} onChange={(v) => set('course', v)} placeholder="Computer Science" />
          <Field label="Graduation date" type="date" value={form.graduationDate} onChange={(v) => set('graduationDate', v)} />
          <Button type="submit" fullWidth className="mt-1 sm:col-span-2">
            Run Senate-List match
          </Button>
        </form>

        {result && (
          result.ok ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent-500/30 bg-accent-500/[0.08] p-3 text-sm text-accent-600 dark:text-accent-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>All fields match the on-chain record. You’re clear for mobilization.</span>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-warning-500/30 bg-warning-500/[0.08] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-warning-500">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {result.mismatches.length} mismatch(es) — fix before the Senate List is sent:
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-warning-500">
                {result.mismatches.map((m, i) => (
                  <li key={i}>• <strong>{m.field}</strong>: you entered “{m.got}”, record says “{m.expected}”.</li>
                ))}
              </ul>
            </div>
          )
        )}
      </Card>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-content-secondary">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border-subtle bg-bg-elevated px-2.5 py-2 text-sm text-content-primary transition-colors duration-150 placeholder:text-content-muted hover:border-border-strong focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}
