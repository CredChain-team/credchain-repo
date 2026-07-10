# CredChain — Week 3 Notes (Self-Upload Trust Gap)

_Dated: 2026-07-10._

This file documents what was built/verified to close the **self-upload trust gap** —
the missing middle ground between issuer-minted `verifiedSkills` and never-trusted
`sandboxSkills` — plus the "Find your institution" directory and a bounded hardening
pass. Mirrors the format of `WEEK-1-NOTES.md`.

---

## 1. What was done

### 🟢 Task 1 — Paid-delivery pathway promoted to LIVE (frontend-only)
The `delivery` pathway was already fully wired on the backend — `deliveryStats.completed`
only increments after an **employer confirms** a delivery (`confirmDelivery` / `selectWinners`
in `bountyController.js`), never on mere submission. The invariant already held, so this
was a pure UI flip.

**Files updated:**
- `frontend/src/components/student/VerificationPathways.jsx` — `delivery` entry flipped to
  `live: true` with `action: 'View my delivered work'`; kept its existing "grows on its own"
  note.
- `frontend/src/portals/StudentPortal.jsx` — `onSelectPathway('delivery')` routes to the
  **Earn** tab.

> The CredScore formula's delivery term was **not** touched — it already weights this.

### 🟣 Task 2 — Minimal vouch model (the core build)
A high-reputation user (reputation ≥ 60) can **stake 10 reputation points** to attest one of
a student's self-declared skills, promoting it `sandbox → attested` (partial trust — between
verified and self-declared, never equal to an issuer credential). Enforced by the **same**
dispute/admin-resolve machinery already proven for credentials.

**Schema:**
- `backend/src/models/User.js` — added `reputationScore` (default **20**, 0–100).
- `backend/src/models/StudentProfile.js` — added the `attestedSkills[]` array, whose `dispute`
  sub-doc mirrors `Credential.dispute` **exactly** (same enum + field names) so one admin queue
  handles both. Subdocs keep their default `_id` (used as the dispute key). Added
  `attestedBonus` to the `credScore.breakdown`.

**New controller — `backend/src/controllers/vouchController.js`:**
- `POST /api/v1/student/:studentId/sandbox/:skillIndex/vouch` (requireAuth) — 403 if
  reputation < 60, 403 on self-vouch, 404 if no skill at index. Moves the skill
  `sandbox → attested` atomically, deducts 10 points (floor 0), recalculates CredScore.
- `POST /api/v1/attested/:studentId/:attestedIndex/dispute` (requireAuth, student-only,
  owner) — freezes the attestation `under_review` (does not remove it), mirroring
  `disputeCredential`.

**Reused the existing admin queue (generalized, not duplicated) —
`backend/src/controllers/credentialController.js`:**
- `listDisputes` now merges credential disputes **and** attested-skill disputes into one
  response, each tagged `type: 'credential' | 'vouch'` (+ `stakedPoints` for vouches).
- `resolveDispute` tries a `Credential` by `:id` first (unchanged behaviour); if not found,
  falls back to an `attestedSkills` sub-doc:
  - **reinstate** → attestation counts again **and the voucher's 10 points are returned** (cap 100).
  - **uphold** → attestation frozen out permanently; **the 10 points stay forfeited**.
  - Recalculates the student's CredScore after either outcome.

**CredScore — `backend/src/utils/credScore.js`:**
- New capped term: `attestedBonus = min(activeAttested × 5, 15)`. Only **active** vouches count
  (a vouch `under_review` or `resolved_upheld` is excluded — frozen, like a disputed credential).
  Hard-capped at **+15** so it can't be farmed by collecting many low-effort vouches. The header
  formula block + `breakdown` were updated to match.

**Frontend:**
- `VerificationPathways.jsx` — `peer` pathway flipped to `live: true`, `action: 'Request a vouch'`.
- `StudentPortal.jsx` — `peer` opens a **RequestVouchModal** (shareable per-skill link); `attested`
  disputes wired to a new `handleDisputeAttested`.
- New `frontend/src/components/student/RequestVouchModal.jsx` — copyable `/vouch/:studentId/:skillIndex`
  link per sandbox skill.
- New `frontend/src/pages/VouchPage.jsx` + route in `App.jsx` — any signed-in member lands here
  from the link; gated in-page (sign-in prompt, self-vouch block, 60+ reputation messaging) and
  vouches in one click.
- `frontend/src/components/ui/TrustTier.jsx` — new **Attested** badge (violet tone) between
  Verified and Self-declared (`AttestedBadge` / `VerifiedBadge` / `SelfDeclaredBadge` helpers).
- `frontend/src/components/student/TwoTierLedger.jsx` — renders a distinct **Attested** section
  (voucher name, "under review" state, dispute affordance) and a "Request a vouch" copy-link on
  each sandbox skill.
- `frontend/src/components/admin/DisputeQueue.jsx` — the live admin queue now labels each row
  `Vouch` vs `Credential` and adapts the button copy (reinstate returns stake / uphold forfeits).
- Plumbing: `studentController.getStudentPortfolio` returns an `attestedLedger`; surfaced through
  `hooks/useStudentVault.js` and `services/api.js` (`vouchSandboxSkill`, `disputeAttestation`).

> The legacy, **unused** `frontend/src/portals/AdminDisputes.jsx` was updated for consistency,
> but the component actually rendered by `/admin` is `components/admin/DisputeQueue.jsx`.

### 🔵 Task 3 — Employer filter → three states (frontend + feed field)
The binary "Hide unverified" toggle became a 3-way **Verified only / Verified + Attested /
Everything** segmented control — a display filter (consistent with the old toggle), not a score
multiplier.

**Files updated:**
- `backend/src/controllers/employerController.js` — `talentFeed` now returns an `attested[]` array
  per student (attested skill names, **excluding** disputed/upheld ones).
- `frontend/src/components/employer/TalentFeed.jsx` — segmented control gates which skill groups
  render (verified always; attested when ≥ attested; sandbox only on everything).
- `frontend/src/portals/EmployerPortal.jsx` — `hideUnverified` boolean replaced with a `skillView`
  state (`'verified' | 'attested' | 'all'`).

### 🟠 Extra — "Find your institution" (user-requested)
The institutional pathway button ("Check if my school is set up") previously promised a directory
that didn't exist. Now it's real.

**Files updated / created:**
- `backend/src/controllers/issuerController.js` — new `listIssuerDirectory`: **verified issuers
  only**, public-safe projection (name, type, domain, status) — **no** risk flags / KYC / email.
  The WHOIS/DNS/KYC funnel was **not** touched.
- `backend/src/routes/v1.js` — `GET /api/v1/issuers/directory` (requireAuth).
- New `frontend/src/components/student/FindInstitutionModal.jsx` — searchable list; each result
  shows a "Set up" badge = can send credentials straight to your vault.
- `StudentPortal.jsx` — `institutional` pathway opens this modal (was jumping to the Nigeria tab).

### 🟤 Hardening + demo readiness
- `backend/.env` — added `ADMIN_EMAILS` (`admin@credchain.io,demo-employer@credchain.demo`) so the
  **independent** admin dispute/fraud queue is demoable on stage. The demo-employer is a valid
  independent reviewer — it is neither the issuer that vouches nor the student that disputes.
  _(This closes the open item carried over from the anti-collusion bundle.)_
- `backend/src/scripts/seed.js`:
  - Demo issuer reputation **85**, demo employer **75**, every 3rd seeded student **65** (rest at
    the default 20) — so vouching is demoable live.
  - The demo student keeps **one un-vouched** sandbox skill (for a live vouch on stage) and **one
    pre-attested** skill (via a seeded high-rep voucher, "Chidera Nwankwo") — so the Attested badge
    and the employer "Verified + Attested" filter render without any live action.

---

## 2. How to run it

Use **Git Bash**. Ports are unchanged (see §4). First-time or after schema changes, **re-seed**.

**Terminal 1 — backend:**
```bash
cd "/c/Chris Stuff/CredChain/backend"
npm run seed     # re-seed demo data (idempotent; only touches @credchain.demo users)
npm run dev
```

**Terminal 2 — frontend:**
```bash
cd "/c/Chris Stuff/CredChain/frontend"
npm run dev
```

Then open **http://localhost:3000** and use the one-click demo logins.

### Demo walk-through (the new flows)
1. **Student vault** → the ledger now shows three tiers: **Verified**, **Attested** (violet badge,
   with the voucher's name), and **Self-declared**. The pre-seeded attested skill is already there.
2. **Request a vouch** → open the `peer` pathway (or the copy-link on a sandbox skill) → copy the
   `/vouch/:studentId/:skillIndex` link.
3. **Vouch** → sign in as the **demo issuer** (reputation 85), paste the link → **Vouch & stake 10
   points**. The skill jumps `sandbox → attested`, CredScore rises +5, the voucher's reputation
   drops 85 → 75.
4. **Dispute → resolve** → as the student, dispute the attestation → sign in as the **demo
   employer** (admin) → `/admin` → **Disputes** → the row is labelled **Vouch**. _Reinstate_
   returns the 10 points; _Uphold_ forfeits them and the skill stops counting.
5. **Find your institution** → the `institutional` pathway opens the searchable directory of
   verified issuers.
6. **Employer talent feed** → the 3-way **Verified only / Verified + Attested / Everything** filter
   gates which skill chips render per candidate.

---

## 3. Verification (what was actually checked)

- `node --check` on all 10 changed backend files → **all OK**.
- **CredScore unit test**: 1 attested → **+5**; 3 & 5 attested → **+15** (cap holds);
  `under_review` + `resolved_upheld` → **excluded** (only active counts). ✅
- `npm run seed` → 23 demo users, incl. the pre-attested skill, no errors. ✅
- **Live E2E** against the running server (scripted, then deleted):
  - demo logins ✅ · portfolio `sandbox=1 / attested=1` ✅ · issuer directory returns 7 verified
    issuers with no risk/email fields ✅
  - self-vouch → **403** ✅ · high-rep vouch → **201**, skill moves `sandbox→attested`, CredScore
    610 → 615, voucher reputation 85 → 75 ✅
  - attestation dispute → appears in the unified admin queue tagged `type: 'vouch'` ✅
  - admin **reinstate** → returns 10 points + skill re-counts ✅ · admin **uphold** → 10 points
    forfeited + skill stops counting (615 → 610) ✅
  - **existing credential dispute** (revoked → dispute → reinstate) still works unchanged, shows
    `type: 'credential'` in the same queue ✅
- `npm run build` (frontend) → **passes**, 2344 modules (VouchPage / FindInstitutionModal /
  RequestVouchModal all compile). ✅
- Re-seeded to a clean demo state; all temporary test scripts removed.

---

## 4. Fixed ports (never change these)

| Service          | URL                     |
|------------------|-------------------------|
| Frontend         | http://localhost:3000   |
| Backend API      | http://localhost:5000   |
| CV Engine (Tony) | http://localhost:8001   |
| Insights (Zhavia)| http://localhost:8002   |

**"Port already in use"?** A previous server is still running — find and stop it; do not change
the port number.

---

## 5. Constraints honoured

- **Not modified:** `IssuerProfile.js`, the `issuerController.js` WHOIS/DNS/KYC/registry funnel,
  and the existing `Credential.js` dispute flow — the dispute machinery was **generalized**, never
  replaced.
- Matched existing style: file header comment blocks, the `{ success, message, ... }` response
  shape, the try/catch + `[scope]` `console.error` pattern.
- **No new npm packages** — schema + controller + route + frontend work using what's installed.

---

## 6. Not done (needs you / a human)

- **Git steps** (branch, commit, PR) — this folder isn't a git repo locally. When ready, stage the
  changed `backend/` + `frontend/` files on a `week-3-<name>` branch. **Do not commit `backend/.env`**
  (it's git-ignored) — instead set `ADMIN_EMAILS` in the real environment.
- **Browser smoke test** — run the servers, open http://localhost:3000, and click through the demo
  walk-through in §2.
- **Optional future work (explicitly out of scope):** full staking/decay/multi-voucher reputation
  economy; continuous score multipliers on the employer filter; the remaining `portfolio`
  ("Show your work") pathway.
