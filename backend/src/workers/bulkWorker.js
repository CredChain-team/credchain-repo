// ─────────────────────────────────────────────────────────────
// CredChain Backend — Async Bulk-Upload Worker (System 2)
// Runs AFTER the controller has already returned 202 Accepted. Writes each
// CSV row as a pending Credential, fingerprints it, and streams live
// percent-complete progress to the issuer's Socket.io room.
//
// Job state is held in an in-memory Map (good enough for a demo; lost on
// restart). The socket stream is the live channel; GET /issuer/bulk/:jobId
// reads this same Map as a poll fallback for curl-based testing.
// ─────────────────────────────────────────────────────────────

const Credential = require('../models/Credential');
const { computeCredentialHash } = require('../utils/hash');

// jobId → { issuerId, total, processed, failed, status, errors[], startedAt, finishedAt }
const jobs = new Map();

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function createJob(jobId, issuerId, total) {
  const job = {
    jobId,
    issuerId: String(issuerId),
    total,
    processed: 0,
    failed: 0,
    status: 'queued',
    percent: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  jobs.set(jobId, job);
  return job;
}

/**
 * Process a parsed CSV of credential rows in the background.
 * Each row needs at least a `title`; `recipientemail` is recommended.
 * @param {import('socket.io').Server} io
 * @param {string} jobId
 * @param {string} issuerId
 * @param {Array<Object>} rows  output of parseCsv()
 */
async function processBulkJob(io, jobId, issuerId, rows) {
  const job = jobs.get(jobId) || createJob(jobId, issuerId, rows.length);
  job.status = 'processing';
  const room = String(issuerId);

  const emit = (event) => {
    if (io) io.to(room).emit(event, { ...job });
  };
  emit('bulk:start');

  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      const title = row.title || row.credential || row.name;
      const recipientEmail = (row.recipientemail || row.email || '').toLowerCase();

      try {
        if (!title) throw new Error('missing "title" column');

        // Build the doc first so createdAt exists for the hash, then persist.
        const doc = new Credential({
          title,
          issuerId,
          recipientEmail,
          issuer: row.issuer || undefined,
          status: 'pending',
        });
        doc.sha256Hash = computeCredentialHash(doc);
        doc.hash = doc.sha256Hash; // keep legacy alias in sync
        await doc.save();

        job.processed += 1;
      } catch (rowErr) {
        job.failed += 1;
        job.errors.push({ row: i + 1, reason: rowErr.message });
      }

      job.percent = Math.round(((job.processed + job.failed) / job.total) * 100);
      emit('bulk:progress');

      // Yield to the event loop so a huge sheet never blocks other requests.
      if (i % 25 === 0) await new Promise((r) => setImmediate(r));
    }
  } finally {
    // Always signal completion — even if the loop throws unexpectedly — so
    // the issuer's UI never hangs on "processing" forever.
    job.status = 'complete';
    job.finishedAt = new Date().toISOString();
    emit('bulk:complete');
  }

  return job;
}

module.exports = { processBulkJob, createJob, getJob, jobs };
