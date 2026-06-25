// ─────────────────────────────────────────────────────────────
// CredChain — Verification Report export (Section 4.2)
// Produces the downloadable proof-of-due-diligence an employer keeps on file —
// the artefact that displaces a paid background-check vendor. Two formats:
// JSON (machine record) and a printable HTML report (PDF via the browser's
// "Save as PDF"). No backend / external dependency needed.
// ─────────────────────────────────────────────────────────────

export function buildReport(candidate, employerName) {
  return {
    report: 'CredChain Verification Report',
    generatedAt: new Date().toISOString(),
    preparedFor: employerName || 'Employer',
    candidate: {
      id: candidate.id,
      name: candidate.name,
      country: candidate.country,
      credScore: candidate.credScore,
      globalTrustPass: Boolean(candidate.globalTrustPass),
    },
    verifiedCredentials: (candidate.verified || []).map((c) => ({
      title: c.title,
      issuer: c.issuer,
      issuerTrustTier: c.tier,
      anchoredOnChain: Boolean(c.onChain),
    })),
    unverifiedClaims: candidate.sandbox || [],
    disclaimer:
      'Verified credentials are cryptographically anchored and issuer-vouched. Unverified claims are self-asserted and carry no trust weight.',
  };
}

export function downloadJson(candidate, employerName) {
  const data = JSON.stringify(buildReport(candidate, employerName), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `credchain-report-${(candidate.name || 'candidate').replace(/\s+/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printReport(candidate, employerName) {
  const r = buildReport(candidate, employerName);
  const rows = r.verifiedCredentials
    .map((c) => `<tr><td>${c.title}</td><td>${c.issuer}</td><td>${c.issuerTrustTier}</td><td>${c.anchoredOnChain ? '✓ on-chain' : 'verified'}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>CredChain Verification Report</title>
    <style>
      body{font-family:system-ui,Arial,sans-serif;color:#0f172a;max-width:720px;margin:40px auto;padding:0 20px}
      h1{color:#059669;margin-bottom:0} .muted{color:#64748b;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;font-size:13px}
      th{background:#f1f5f9} .badge{display:inline-block;background:#ecfdf5;color:#059669;padding:2px 8px;border-radius:999px;font-size:12px}
      .foot{margin-top:24px;font-size:12px;color:#64748b}
    </style></head><body>
    <h1>CredChain Verification Report</h1>
    <p class="muted">Generated ${new Date(r.generatedAt).toLocaleString()} · Prepared for ${r.preparedFor}</p>
    <h2>${r.candidate.name} <span class="badge">CredScore ${r.candidate.credScore}</span></h2>
    <p class="muted">${r.candidate.country}${r.candidate.globalTrustPass ? ' · Global Trust Pass ✓' : ''}</p>
    <h3>Verified credentials (issuer-vouched, on-chain)</h3>
    <table><thead><tr><th>Credential</th><th>Issuer</th><th>Trust tier</th><th>Anchor</th></tr></thead><tbody>${rows || '<tr><td colspan="4">None</td></tr>'}</tbody></table>
    <h3>Unverified / self-asserted claims</h3>
    <p class="muted">${(r.unverifiedClaims || []).join(', ') || 'None'}</p>
    <p class="foot">${r.disclaimer}</p>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
