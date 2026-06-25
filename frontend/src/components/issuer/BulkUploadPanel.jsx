// ─────────────────────────────────────────────────────────────
// CredChain — Enterprise Bulk-Upload Engine (System 2) + Maker-Checker
// Drag-and-drop CSV (≤500 rows). A "maker" stages the batch; a second
// authorized "checker" must approve before anything is sent (one compromised
// login can't mint fraud). On send, the backend returns 202 + a jobId and the
// worker streams `bulk:start|progress|complete` to the issuer's Socket.io
// room — we animate a 0→100% bar live.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, Trash2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { bulkUploadCredentials } from '../../services/api';
import { connectSocket, socket } from '../../services/socket';
import { Card, Button, Input, Switch, Badge } from '../ui';
import { fadeUp } from '../../theme/motion';

const SAMPLE = 'title,recipientEmail\nB.Sc Computer Science,amaka@example.com\nFrontend Bootcamp Certificate,tobi@example.com';

function countRows(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return Math.max(0, lines.length - 1); // minus header
}

// Parse CSV into preview rows (title, recipientEmail) for display only.
function parseRows(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const [title = '', recipientEmail = ''] = line.split(',');
    return { title: title.trim(), recipientEmail: recipientEmail.trim() };
  });
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
  const sameNames = checker.trim() && checker.trim() === maker.trim();
  const ready = rows > 0 && !tooMany && maker.trim() && checker.trim() && checker.trim() !== maker.trim() && checkerApproved;
  const preview = parseRows(csv);

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
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-600">
          <UploadCloud className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-content-primary">Enterprise Bulk-Upload</h3>
          <p className="mt-0.5 text-xs text-content-secondary">
            Up to 500 rows. CSV header: <code className="font-mono text-[13px] text-brand-600 dark:text-brand-300">title,recipientEmail</code>
          </p>
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
          onClick={() => fileRef.current?.click()}
          className={`group cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-all duration-200 ${
            dragOver ? 'border-brand-500 bg-brand-soft' : 'border-border-strong bg-bg-sunken hover:border-brand-400 hover:bg-brand-soft'
          }`}
        >
          <UploadCloud className={`mx-auto h-10 w-10 transition-transform duration-200 group-hover:scale-110 ${dragOver ? 'text-brand-600' : 'text-content-muted'}`} />
          <p className="mt-3 text-sm font-semibold text-content-primary">Drag &amp; drop a CSV here, or click to choose a file</p>
          <p className="mt-1 text-xs text-content-secondary">
            CSV with a <code className="font-mono">title,recipientEmail</code> header
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
          <button type="button" onClick={(e) => { e.stopPropagation(); setCsv(SAMPLE); }} className="mt-3 text-xs font-semibold text-brand-600 hover:underline">
            load a sample
          </button>
        </div>

        {csv && (
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-content-muted" />
                <Badge tone={tooMany ? 'danger' : 'brand'}>
                  {rows} row{rows === 1 ? '' : 's'}
                </Badge>
                {tooMany && <span className="text-xs text-danger-500">exceeds the 500-row limit</span>}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCsv('')} leftIcon={<Trash2 className="h-4 w-4" />}>
                Clear
              </Button>
            </div>

            {/* Per-row preview */}
            {preview.length > 0 && (
              <div className="mt-2 max-h-44 overflow-y-auto scroll-thin rounded-lg border border-border-subtle">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-bg-sunken text-content-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Title</th>
                      <th className="px-3 py-2 font-semibold">Recipient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {preview.slice(0, 50).map((row, i) => (
                      <tr key={i} className="text-content-secondary">
                        <td className="px-3 py-1.5 tabular-nums text-content-muted">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-content-primary">{row.title || <span className="text-danger-500">missing</span>}</td>
                        <td className="px-3 py-1.5 font-mono">{row.recipientEmail || <span className="text-content-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 50 && <p className="px-3 py-2 text-[11px] text-content-muted">+ {preview.length - 50} more rows…</p>}
              </div>
            )}
          </motion.div>
        )}

        {/* Maker-Checker dual approval */}
        <div className="mt-5 rounded-lg border border-warning-500/30 bg-warning-500/[0.06] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-warning-500" />
            <p className="text-sm font-semibold text-content-primary">Maker-Checker dual approval</p>
          </div>
          <p className="mt-0.5 text-[11px] text-content-secondary">Two authorized staff must approve a high-stakes batch.</p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="Maker (preparer) name" />
            <Input value={checker} onChange={(e) => setChecker(e.target.value)} placeholder="Checker (approver) name" error={sameNames ? 'Must differ from the maker.' : undefined} />
          </div>
          <div className="mt-3">
            <Switch
              checked={checkerApproved}
              onChange={setCheckerApproved}
              label={`Checker approves this batch of ${rows} credential(s).`}
            />
          </div>
        </div>

        <Button type="button" fullWidth className="mt-4" onClick={send} disabled={!ready} loading={busy}>
          {busy ? 'Submitting…' : 'Approve & send batch'}
        </Button>

        {error && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="mt-3 flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] px-4 py-3 text-sm text-danger-500"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Live progress */}
        {job && (
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-content-secondary">
                {job.status === 'complete'
                  ? <><CheckCircle2 className="h-3.5 w-3.5 text-accent-500" /> Complete</>
                  : 'Uploading…'}
                <span className="text-content-muted">({job.processed || 0}/{job.total || 0})</span>
              </span>
              <span className="font-semibold tabular-nums text-content-primary">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-sunken">
              <motion.div
                className={`h-2 rounded-full ${job.status === 'complete' ? 'bg-accent-500' : 'bg-brand-600'}`}
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            {job.failed > 0 && <p className="mt-1.5 text-xs text-warning-500">{job.failed} row(s) failed.</p>}
            {job.status === 'complete' && job.failed === 0 && (
              <p className="mt-1.5 text-xs text-accent-600 dark:text-accent-400">All {job.total} credentials minted (pending acceptance).</p>
            )}
            {Array.isArray(job.errors) && job.errors.length > 0 && (
              <ul className="mt-1.5 max-h-24 overflow-auto scroll-thin text-[11px] text-warning-500">
                {job.errors.slice(0, 8).map((e, i) => <li key={i}>row {e.row}: {e.reason}</li>)}
              </ul>
            )}
          </motion.div>
        )}
      </div>
    </Card>
  );
}
