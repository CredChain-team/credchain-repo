// ─────────────────────────────────────────────────────────────
// CredChain — Enterprise Bulk-Upload Engine (System 2) + Maker-Checker
// Drag-and-drop CSV (≤500 rows). A "maker" stages the batch; a second
// authorized "checker" must approve before anything is sent (one compromised
// login can't mint fraud). On send, the backend returns 202 + a jobId and the
// worker streams `bulk:start|progress|complete` to the issuer's Socket.io
// room — we animate a 0→100% bar live.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { bulkUploadCredentials } from '../../services/api';
import { connectSocket, socket } from '../../services/socket';

const SAMPLE = 'title,recipientEmail\nB.Sc Computer Science,amaka@example.com\nFrontend Bootcamp Certificate,tobi@example.com';

function countRows(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return Math.max(0, lines.length - 1); // minus header
}

export default function BulkUploadPanel({ userId }) {
  const [csv, setCsv] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [maker, setMaker] = useState('');
  const [checker, setChecker] = useState('');
  const [checkerApproved, setCheckerApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState(null); // live job from socket
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const rows = countRows(csv);
  const tooMany = rows > 500;
  const ready = rows > 0 && !tooMany && maker.trim() && checker.trim() && checker.trim() !== maker.trim() && checkerApproved;

  // Subscribe to the issuer's bulk-progress stream for the whole panel life.
  useEffect(() => {
    if (!userId) return undefined;
    connectSocket(userId);
    const onStart = (j) => setJob({ ...j, status: 'processing' });
    const onProgress = (j) => setJob(j);
    const onComplete = (j) => setJob({ ...j, status: 'complete' });
    socket.on('bulk:start', onStart);
    socket.on('bulk:progress', onProgress);
    socket.on('bulk:complete', onComplete);
    return () => {
      socket.off('bulk:start', onStart);
      socket.off('bulk:progress', onProgress);
      socket.off('bulk:complete', onComplete);
    };
  }, [userId]);

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.readAsText(file);
  }

  async function send() {
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      const res = await bulkUploadCredentials(csv);
      // Seed the bar immediately; socket events refine it.
      setJob({ jobId: res.jobId, total: res.total, processed: 0, failed: 0, percent: 0, status: 'queued', errors: [] });
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 403
          ? 'Issuer not vetted yet — finish verification before bulk-issuing.'
          : err?.response?.data?.message || 'Bulk upload failed to start.'
      );
    } finally {
      setBusy(false);
    }
  }

  const percent = job?.percent ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <h3 className="text-sm font-semibold text-gray-900">Enterprise Bulk-Upload</h3>
      <p className="mt-1 text-xs text-gray-500">Up to 500 rows. CSV header: <code className="font-mono text-[13px] text-blue-700">title,recipientEmail</code></p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
        onClick={() => fileRef.current?.click()}
        className={`group mt-3 cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${dragOver ? 'border-blue-400 bg-blue-100' : 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'}`}
      >
        <div className="text-4xl text-blue-400 transition-transform duration-200 group-hover:scale-110">📤</div>
        <p className="mt-3 text-sm font-semibold text-blue-700">Drag &amp; drop a CSV here, or click to choose a file</p>
        <p className="mt-1 text-xs text-blue-500">CSV with a <code className="font-mono">title,recipientEmail</code> header</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
        <button type="button" onClick={(e) => { e.stopPropagation(); setCsv(SAMPLE); }} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
          load a sample
        </button>
      </div>

      {csv && (
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-lg font-bold tracking-tight ${tooMany ? 'text-red-600' : 'text-gray-900'}`}>
            {rows} row{rows === 1 ? '' : 's'} {tooMany && <span className="text-sm font-normal">— exceeds the 500-row limit</span>}
          </span>
          <button type="button" onClick={() => setCsv('')} className="text-xs text-gray-400 hover:text-gray-600">clear</button>
        </div>
      )}

      {/* Maker-Checker dual approval */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-semibold text-amber-800">Maker-Checker dual approval</p>
        <p className="text-[11px] text-amber-700/70">Two authorized staff must approve a high-stakes batch.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="Maker (preparer) name" className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <input value={checker} onChange={(e) => setChecker(e.target.value)} placeholder="Checker (approver) name" className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        {checker.trim() && checker.trim() === maker.trim() && (
          <p className="mt-1 text-[11px] text-red-600">Checker must be a different person from the maker.</p>
        )}
        <label className="mt-2 flex items-center gap-2 text-xs text-amber-800">
          <input type="checkbox" checked={checkerApproved} onChange={(e) => setCheckerApproved(e.target.checked)} className="accent-blue-600" />
          Checker approves this batch of {rows} credential(s).
        </label>
      </div>

      <button
        type="button"
        onClick={send}
        disabled={!ready || busy}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Approve & send batch'}
      </button>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
          <span className="mt-0.5 shrink-0">✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Live progress */}
      {job && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>{job.status === 'complete' ? 'Complete' : 'Uploading…'} ({job.processed || 0}/{job.total || 0})</span>
            <span>{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ease-out ${job.status === 'complete' ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {job.failed > 0 && <p className="mt-1 text-xs text-amber-600">{job.failed} row(s) failed.</p>}
          {job.status === 'complete' && job.failed === 0 && <p className="mt-1 text-xs text-emerald-600">All {job.total} credentials minted (pending acceptance).</p>}
          {Array.isArray(job.errors) && job.errors.length > 0 && (
            <ul className="mt-1 max-h-24 overflow-auto text-[11px] text-amber-700">
              {job.errors.slice(0, 8).map((e, i) => <li key={i}>row {e.row}: {e.reason}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
