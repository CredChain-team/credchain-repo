// ─────────────────────────────────────────────────────────────
// CredChain — NYSC Pre-Validation Tracker
// Cross-references on-chain student data (matric, DOB, course, graduation
// date) against a MOCK "NYSC Senate List Matching Engine". Mismatches raise
// an amber warning months before the real Senate List is sent — catching
// the data errors that cause mobilization failures while there's still time.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

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
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🪖</span>
          <h2 className="text-sm font-semibold tracking-tight text-blue-900">NYSC Pre-Validation</h2>
        </div>
        <button type="button" onClick={prefillFromRecord} className="text-xs font-medium text-blue-600 hover:underline">Use my on-chain record</button>
      </div>
      <p className="mt-1 text-xs text-blue-700/70">Catch Senate-List data mismatches now — not after mobilization fails.</p>

      <form onSubmit={runMatch} className="mt-4 grid grid-cols-2 gap-2">
        <Field label="Matric number" value={form.matric} onChange={(v) => set('matric', v)} placeholder="UNN/2021/CSC/0184" />
        <Field label="Date of birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} />
        <Field label="Course" value={form.course} onChange={(v) => set('course', v)} placeholder="Computer Science" />
        <Field label="Graduation date" type="date" value={form.graduationDate} onChange={(v) => set('graduationDate', v)} />
        <button
          type="submit"
          className="col-span-2 mt-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97]"
        >
          Run Senate-List match
        </button>
      </form>

      {result && (
        result.ok ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            ✓ All fields match the on-chain record. You’re clear for mobilization.
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">⚠ {result.mismatches.length} mismatch(es) — fix before the Senate List is sent:</p>
            <ul className="mt-1 space-y-1 text-xs text-amber-700">
              {result.mismatches.map((m, i) => (
                <li key={i}>• <strong>{m.field}</strong>: you entered “{m.got}”, record says “{m.expected}”.</li>
              ))}
            </ul>
          </div>
        )
      )}
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}
