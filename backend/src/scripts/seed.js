// ─────────────────────────────────────────────────────────────
// CredChain — demo seed script   (run: `npm run seed` from /backend)
//
// Populates a rich, demo-ready dataset so no screen is ever empty on stage:
//   • 3 one-click demo accounts (student / issuer / employer)
//   • verified issuers for the public registry
//   • discoverable students with varied CredScores for talent search
//   • accepted credentials (mock-anchored) + a revoked one for the demo
//
// IDEMPOTENT: every seeded user uses the @credchain.demo email domain.
// On each run we delete those users and all docs that reference them,
// then recreate — so re-seeding never duplicates and never touches real data.
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const IssuerProfile = require('../models/IssuerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const Bounty = require('../models/Bounty');
const BountyApplication = require('../models/BountyApplication');
const InstitutionRequest = require('../models/InstitutionRequest');
const { recalculateCredScore, assignTier } = require('../utils/credScore');
const { computeCredentialHash } = require('../utils/hash');
const { mockMemoSignature } = require('../config/solana');

const DEMO_DOMAIN = '@credchain.demo';
const PASS = 'demo1234';

function ccId() {
  return `cc_${crypto.randomBytes(4).toString('hex')}`;
}
function pick(arr, i) {
  return arr[i % arr.length];
}

const SKILLS = [
  { category: 'Frontend', name: 'React.js', tags: ['React', 'JavaScript', 'Frontend'] },
  { category: 'Backend', name: 'Node.js', tags: ['Node.js', 'Express', 'Backend'] },
  { category: 'Data', name: 'Python Data Analysis', tags: ['Python', 'Pandas', 'Data'] },
  { category: 'Design', name: 'Product Design', tags: ['Figma', 'UI', 'UX'] },
  { category: 'Mobile', name: 'Flutter', tags: ['Flutter', 'Dart', 'Mobile'] },
  { category: 'Blockchain', name: 'Solana Development', tags: ['Solana', 'Rust', 'Web3'] },
  { category: 'Backend', name: 'Smart Contracts', tags: ['Solidity', 'Web3', 'Backend'] },
  { category: 'Data', name: 'Machine Learning', tags: ['Python', 'ML', 'TensorFlow'] },
];

const STUDENT_NAMES = [
  'Amara Okafor', 'Chidi Eze', 'Ngozi Bello', 'Tunde Adeyemi', 'Fatima Yusuf',
  'Emeka Nwosu', 'Aisha Mohammed', 'Kelechi Obi', 'Zainab Sani', 'Ifeoma Okeke',
  'Segun Bakare', 'Halima Abubakar', 'Chinwe Maduka',
];

const CITIES = [
  { city: 'Lagos', country: 'NG' }, { city: 'Abuja', country: 'NG' },
  { city: 'Enugu', country: 'NG' }, { city: 'Nairobi', country: 'KE' },
  { city: 'Accra', country: 'GH' },
];

const ISSUERS = [
  { name: 'University of Nigeria, Nsukka', domain: 'unn.edu.ng', type: 'university' },
  { name: 'Andela Talent Academy', domain: 'andela.demo', type: 'bootcamp' },
  { name: 'AltSchool Africa', domain: 'altschool.demo', type: 'bootcamp' },
  { name: 'Covenant University', domain: 'covenant.edu.ng', type: 'university' },
  { name: 'Paystack Engineering', domain: 'paystack.demo', type: 'company' },
  { name: 'Solana Foundation', domain: 'solana.demo', type: 'certifier' },
];

const TITLES = [
  'Frontend Engineering — Practitioner', 'Backend Engineering — Practitioner',
  'Data Analysis Certificate', 'Product Design Fundamentals', 'Mobile Development — Flutter',
  'Solana dApp Development', 'Cloud & DevOps Essentials', 'Machine Learning Foundations',
];

// Demo bounties posted by the demo employer — mirror the frontend mock so the
// Earn / Bounties tabs look rich and real on stage. Escrow is held up front.
const BOUNTY_SEED = [
  {
    company: 'Paystack', companyLogo: '🟢',
    title: 'Build a rate-limited Payments webhook handler',
    description: 'Implement a Node.js webhook endpoint for Paystack payment events with HMAC signature verification, idempotency keys, and exponential backoff retry logic. 18 automated tests must pass.',
    skill: 'Backend / Node.js', skillName: 'Paystack Integration', skillCategory: 'Backend',
    skillTags: ['Node.js', 'REST APIs', 'Webhooks', 'Paystack Integration'],
    reward: '₦250,000', rewardUSD: 155, rewardSOL: 1.6, tests: 18,
    requiredTier: 'practitioner', openTo: 'Students welcome — 200 level and above', deadline: '7 days',
  },
  {
    company: 'Flutterwave', companyLogo: '🔶',
    title: 'Reconciliation report: SQL challenge',
    description: 'Given a messy transactions CSV (provided), write SQL queries to flag mismatched settlements, orphaned charges, and duplicate transaction IDs. Document your findings in a structured report.',
    skill: 'Data / SQL', skillName: 'SQL Data Analysis', skillCategory: 'Data',
    skillTags: ['SQL', 'Data Analysis', 'Financial Data'],
    reward: '₦180,000', rewardUSD: 112, rewardSOL: 1.2, tests: 12,
    requiredTier: 'learner', openTo: 'Open to ALL verified students — no experience needed', deadline: '5 days',
  },
  {
    company: 'Andela', companyLogo: '🔵',
    title: 'Accessible React component library (5 components)',
    description: 'Build 5 WCAG 2.1 AA-compliant React components: Modal, Tooltip, Dropdown, DatePicker, Toast. Full Storybook stories, Jest tests, TypeScript types. 24 automated checks.',
    skill: 'Frontend / React', skillName: 'React Component Development', skillCategory: 'Frontend',
    skillTags: ['React', 'TypeScript', 'Accessibility', 'Jest', 'Storybook'],
    reward: '$600', rewardUSD: 600, rewardSOL: 4.0, tests: 24,
    requiredTier: 'practitioner', openTo: 'Students welcome — any year', deadline: '10 days',
  },
  {
    company: 'Cowrywise', companyLogo: '💰',
    title: 'Design 3 onboarding screens in Figma',
    description: 'Create high-fidelity Figma screens for account creation, investment goal setup, and first deposit flow. Must follow the Cowrywise design system (provided). Portfolio review — no automated tests.',
    skill: 'UI/UX Design', skillName: 'UI/UX Design', skillCategory: 'Design',
    skillTags: ['Figma', 'UI Design', 'Prototyping', 'Design Systems'],
    reward: '₦120,000', rewardUSD: 74, rewardSOL: 0.8, tests: 0,
    requiredTier: 'learner', openTo: 'Open to all verified students — perfect first bounty', deadline: '6 days',
  },
  {
    company: 'Mono', companyLogo: '⬛',
    title: 'Write technical docs for 2 API endpoints',
    description: 'Document the Mono /accounts and /transactions endpoints: description, request/response schemas, code samples in JS/Python/cURL, error codes, and a Postman collection.',
    skill: 'Technical Writing', skillName: 'Technical Writing', skillCategory: 'Technical Writing',
    skillTags: ['Technical Writing', 'API Documentation', 'Markdown', 'Developer Guides'],
    reward: '₦80,000', rewardUSD: 50, rewardSOL: 0.5, tests: 0,
    requiredTier: 'learner', openTo: 'Open to all — the best first bounty for writers', deadline: '4 days',
  },
];

// Create a Bounty owned by `employer`, with escrow already held (mock-anchored).
async function seedBounty(employer, def, extra = {}) {
  const escrowSig = mockMemoSignature(`${def.title}|${employer._id}|escrow`);
  return Bounty.create({
    employerId: employer._id,
    company: def.company,
    companyLogo: def.companyLogo,
    title: def.title,
    description: def.description,
    skill: def.skill,
    skillName: def.skillName,
    skillCategory: def.skillCategory,
    skillTags: def.skillTags,
    reward: def.reward,
    rewardUSD: def.rewardUSD,
    rewardSOL: def.rewardSOL,
    tests: def.tests,
    requiredTier: def.requiredTier,
    openTo: def.openTo,
    deadline: def.deadline,
    status: 'open',
    escrow: { state: 'held', amountSOL: def.rewardSOL, heldAt: new Date(), txSignature: escrowSig, mock: true },
    ...extra,
  });
}

// Create an application from `studentSeed` ({user, profile}) to `bounty`.
async function seedApplication(bounty, studentSeed, status = 'applied', delivery = null) {
  const { user, profile } = studentSeed;
  return BountyApplication.create({
    bountyId: bounty._id,
    studentId: user._id,
    employerId: bounty.employerId,
    studentName: user.name,
    credScoreSnapshot: profile.credScore?.value || 300,
    highestTierSnapshot: profile.highestTier || 'learner',
    message: 'My verified skills line up with this task — happy to start immediately.',
    status,
    delivery: delivery || undefined,
  });
}

async function clearDemoData() {
  const demoUsers = await User.find({ email: new RegExp(`${DEMO_DOMAIN.replace('.', '\\.')}$`) }).select('_id');
  const ids = demoUsers.map((u) => u._id);
  if (ids.length) {
    await Promise.all([
      Credential.deleteMany({ $or: [{ studentId: { $in: ids } }, { issuerId: { $in: ids } }] }),
      StudentProfile.deleteMany({ userId: { $in: ids } }),
      IssuerProfile.deleteMany({ userId: { $in: ids } }),
      EmployerProfile.deleteMany({ userId: { $in: ids } }),
      Bounty.deleteMany({ employerId: { $in: ids } }),
      BountyApplication.deleteMany({ $or: [{ studentId: { $in: ids } }, { employerId: { $in: ids } }] }),
      // Institution requests made by demo students (real requests untouched).
      InstitutionRequest.deleteMany({ 'requesters.studentId': { $in: ids } }),
    ]);
    await User.deleteMany({ _id: { $in: ids } });
  }
  console.log(`[seed] cleared ${ids.length} previous demo users + dependents`);
}

async function makeUser(name, role, emailLocal, reputationScore) {
  const passwordHash = await bcrypt.hash(PASS, 10);
  return User.create({
    name,
    email: `${emailLocal}${DEMO_DOMAIN}`,
    passwordHash,
    role,
    credchainId: ccId(),
    ...(reputationScore != null ? { reputationScore } : {}),
  });
}

// Create N accepted, mock-anchored credentials for a student from a given issuer.
async function issueAccepted(student, issuerUser, issuerLabel, count, startIdx) {
  const creds = [];
  for (let i = 0; i < count; i++) {
    const skill = pick(SKILLS, startIdx + i);
    const weight = 0.25 + ((startIdx + i) % 4) * 0.2; // 0.25..0.85
    const doc = new Credential({
      title: pick(TITLES, startIdx + i),
      issuer: issuerLabel,
      issuerId: issuerUser?._id,
      studentId: student._id,
      recipientEmail: student.email,
      status: 'accepted',
      skillCategory: skill.category,
      skillName: skill.name,
      skillTags: skill.tags,
      compositeWeight: weight,
      trustTier: assignTier(weight),
      deliveryCount: (startIdx + i) % 5,
    });
    doc.sha256Hash = computeCredentialHash(doc);
    doc.hash = doc.sha256Hash;
    const sig = mockMemoSignature(doc.sha256Hash);
    doc.solanaTxSignature = sig;
    doc.txSignature = sig;
    await doc.save();
    creds.push(doc);
  }
  return creds;
}

async function seedStudent(name, idx, issuerUser, issuerLabel) {
  const local = 'stu-' + name.toLowerCase().replace(/[^a-z]+/g, '.');
  // Every 3rd student is an established member (reputation 65) who can vouch;
  // the rest start at the default (20) — reputation is earned, not granted.
  const reputationScore = idx % 3 === 0 ? 65 : undefined;
  const user = await makeUser(name, 'student', local, reputationScore);
  const credCount = 2 + (idx % 4); // 2..5
  const creds = await issueAccepted(user, issuerUser, issuerLabel, credCount, idx);

  const completed = 2 + (idx % 7);
  const loc = pick(CITIES, idx);
  const profile = await StudentProfile.create({
    userId: user._id,
    verifiedSkills: creds.map((c) => c._id),
    academicStatus: idx % 3 === 0 ? 'nysc' : 'in_school',
    yearOfStudy: 1 + (idx % 5),
    university: pick(ISSUERS, idx).name,
    course: pick(SKILLS, idx).name,
    discoverable: true,
    location: loc,
    headline: `${pick(SKILLS, idx).category} talent · verified on CredChain`,
    deliveryStats: {
      total: completed + 1,
      completed,
      disputed: 0,
      confirmedAgainst: idx % 9 === 0 ? 1 : 0,
      totalEarnedSOL: Number((completed * 0.4).toFixed(2)),
    },
  });
  await recalculateCredScore(profile, creds);
  return { user, profile, creds };
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[seed] MONGO_URI is not set in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('[seed] connected to MongoDB');

  await clearDemoData();

  // ── Verified issuers (for the public registry + minting) ──────────
  const issuerUsers = [];
  for (let i = 0; i < ISSUERS.length; i++) {
    const it = ISSUERS[i];
    const u = await makeUser(it.name, 'issuer', `iss-${it.domain.replace(/\./g, '-')}`);
    await IssuerProfile.create({
      userId: u._id,
      institutionType: it.type,
      lockedDomain: `${it.domain}-${i}`, // unique sparse domain per seeded issuer
      verificationStatus: 'active',
      isVerifiedIssuer: true,
      domainVerifiedAt: new Date(),
      kyc: { status: 'passed', checkedAt: new Date() },
      registry: { matched: true, reviewedBy: 'seed', reviewedAt: new Date() },
    });
    issuerUsers.push({ user: u, label: it.name });
  }
  console.log(`[seed] created ${issuerUsers.length} verified issuers`);

  // ── The 3 one-click demo accounts ─────────────────────────────────
  // Demo issuer: a real verified issuer that can mint live during the demo.
  // High reputation (85) so they can vouch for a student's sandbox skill live.
  const demoIssuer = await makeUser('Demo Issuer — UNN', 'issuer', 'demo-issuer', 85);
  await IssuerProfile.create({
    userId: demoIssuer._id,
    institutionType: 'university',
    lockedDomain: 'demo-unn.edu.ng',
    verificationStatus: 'active',
    isVerifiedIssuer: true,
    domainVerifiedAt: new Date(),
    kyc: { status: 'passed', checkedAt: new Date() },
    registry: { matched: true, reviewedBy: 'seed', reviewedAt: new Date() },
  });

  // Demo employer. High reputation (75) so the presenter can also vouch live
  // from the employer account if they prefer.
  const demoEmployer = await makeUser('Demo Employer — Paystack', 'employer', 'demo-employer', 75);
  await EmployerProfile.create({
    userId: demoEmployer._id,
    companyName: 'Paystack',
    chatCreditsRemaining: 50,
    verified: true, // vetted sponsor → can mint strong (uncapped) bounty credentials
  });

  // Demo student: rich, populated portfolio + one revoked credential.
  const demoStudent = await makeUser('Amara Okafor', 'student', 'demo-student');
  const demoCreds = await issueAccepted(demoStudent, demoIssuer, 'University of Nigeria, Nsukka', 5, 0);
  // a revoked credential for the demo
  const revoked = new Credential({
    title: 'Outdated Certificate (revoked)',
    issuer: 'University of Nigeria, Nsukka',
    issuerId: demoIssuer._id,
    studentId: demoStudent._id,
    recipientEmail: demoStudent.email,
    status: 'revoked',
    skillCategory: 'Other',
    skillName: 'Legacy Skill',
    skillTags: ['Legacy'],
    compositeWeight: 0.2,
    trustTier: 'learner',
  });
  revoked.sha256Hash = computeCredentialHash(revoked);
  revoked.hash = revoked.sha256Hash;
  revoked.revokedHash = `${revoked.sha256Hash}:REVOKED`;
  revoked.revokedTxSignature = mockMemoSignature(revoked.revokedHash);
  revoked.revokedAt = new Date();
  await revoked.save();

  const demoProfile = await StudentProfile.create({
    userId: demoStudent._id,
    verifiedSkills: demoCreds.map((c) => c._id),
    academicStatus: 'in_school',
    yearOfStudy: 3,
    university: 'University of Nigeria, Nsukka',
    course: 'Computer Science',
    discoverable: true,
    location: { city: 'Enugu', country: 'NG' },
    headline: 'Full-stack & Solana developer · verified on CredChain',
    deliveryStats: { total: 8, completed: 7, disputed: 0, confirmedAgainst: 0, totalEarnedSOL: 3.2 },
    // One sandbox skill is left un-vouched so the presenter can demo a LIVE
    // vouch on stage; the other is pre-attested below.
    sandboxSkills: [
      { skillName: 'Open-source contributions', source: 'GitHub', link: 'https://github.com' },
    ],
  });

  // A seeded high-reputation peer who has already vouched for one of the demo
  // student's skills — so the Attested badge + employer "Verified + Attested"
  // filter render on stage without any live action. Their reputation already
  // reflects the 10-point stake (90 → 80).
  const demoVoucher = await makeUser('Chidera Nwankwo — Senior Engineer', 'employer', 'demo-voucher', 80);
  await EmployerProfile.create({
    userId: demoVoucher._id,
    companyName: 'Interswitch',
    chatCreditsRemaining: 10,
    verified: true,
  });
  demoProfile.attestedSkills.push({
    skillName: 'Technical writing',
    source: 'Self-taught',
    voucherId: demoVoucher._id,
    stakedPoints: 10,
    vouchedAt: new Date(),
    dispute: { status: 'none' },
  });
  await demoProfile.save();

  // recalculateCredScore persists the profile itself (attestedBonus now counts).
  await recalculateCredScore(demoProfile, demoCreds);
  console.log('[seed] created 3 demo accounts (student/issuer/employer) + 1 pre-attested skill');

  // ── Additional discoverable students for talent search ────────────
  const extraStudents = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const issuer = pick(issuerUsers, i);
    extraStudents.push(await seedStudent(STUDENT_NAMES[i], i, issuer.user, issuer.label));
  }
  console.log(`[seed] created ${STUDENT_NAMES.length} additional students`);

  // ── Institution requests (demand signal for the admin queue) ──────
  // Aggregated per institution: a couple of "most-wanted" schools that aren't
  // yet issuers, so the admin "Institution Requests" tab isn't empty on stage.
  const reqStudents = extraStudents.map((s) => s.user._id);
  const REQ_SEED = [
    { name: 'University of Lagos', website: 'unilag.edu.ng', wanted: 6, note: 'Faculty of Engineering' },
    { name: 'Obafemi Awolowo University', website: 'oauife.edu.ng', wanted: 4 },
    { name: 'Yaba College of Technology', website: 'yabatech.edu.ng', wanted: 2 },
  ];
  for (const r of REQ_SEED) {
    const requesters = reqStudents.slice(0, Math.min(r.wanted, reqStudents.length)).map((sid, k) => ({
      studentId: sid,
      note: k === 0 ? (r.note || '') : '',
      requestedAt: new Date(),
    }));
    await InstitutionRequest.create({
      nameKey: InstitutionRequest.toKey(r.name),
      displayName: r.name,
      website: r.website,
      requesters,
      requestCount: requesters.length,
      status: 'pending',
    });
  }
  console.log(`[seed] created ${REQ_SEED.length} institution requests (demand queue)`);

  // ── Bounties + applications (economy layer) ───────────────────────
  // All posted by the demo employer so "My bounties" is populated on login.
  const bounties = [];
  for (const def of BOUNTY_SEED) {
    bounties.push(await seedBounty(demoEmployer, def));
  }

  // A few open applications from real seeded students on the learner bounties,
  // so the employer's "View challenge" list is never empty.
  const learnerBounties = bounties.filter((b) => b.requiredTier === 'learner');
  if (learnerBounties.length && extraStudents.length >= 3) {
    await seedApplication(learnerBounties[0], extraStudents[0], 'applied');
    await seedApplication(learnerBounties[0], extraStudents[1], 'applied');
    if (learnerBounties[1]) await seedApplication(learnerBounties[1], extraStudents[2], 'applied');
    await Bounty.updateOne({ _id: learnerBounties[0]._id }, { $set: { applicantCount: 2 } });
    if (learnerBounties[1]) await Bounty.updateOne({ _id: learnerBounties[1]._id }, { $set: { applicantCount: 1 } });
  }

  // One bounty pre-set to `delivered` with an accepted+delivered application,
  // so the demo can jump straight to "Confirm & release payment" on stage.
  if (learnerBounties[1] && extraStudents[3]) {
    const showcase = learnerBounties[1];
    const deliveredApp = await seedApplication(showcase, extraStudents[3], 'delivered', {
      submittedAt: new Date(),
      text: 'Completed all deliverables to spec and attached the final work for review. Ready for your confirmation.',
      links: ['https://github.com/demo/submission', 'https://figma.com/demo/onboarding'],
    });
    await Bounty.updateOne(
      { _id: showcase._id },
      {
        $set: {
          status: 'delivered',
          acceptedApplicationId: deliveredApp._id,
          applicantCount: (showcase.applicantCount || 0) + 1,
        },
      }
    );
  }
  console.log(`[seed] created ${bounties.length} bounties + demo applications`);

  // ── Global (open competition) bounty + a real field of submissions ────
  // Demonstrates the anti-self-dealing weighting: a contested win (many
  // submissions) mints a strong credential; a shallow field would not.
  const globalEscrowSig = mockMemoSignature(`global|${demoEmployer._id}|hackathon`);
  const globalBounty = await Bounty.create({
    employerId: demoEmployer._id,
    bountyType: 'global',
    company: 'Paystack',
    companyLogo: '🏆',
    title: 'Open Challenge: Best Solana payments demo',
    description: 'Open to every verified student. Build the most compelling Solana-based payments demo. Top 3 entries split the prize pool and mint a competition-weighted credential — the more real entrants you beat, the stronger it is.',
    skill: 'Blockchain / Solana', skillName: 'Solana Payments', skillCategory: 'Blockchain',
    skillTags: ['Solana', 'Web3', 'Payments', 'Rust'],
    prizes: [
      { rank: 1, label: '1st place', amountSOL: 6, amountUSD: 900, reward: '$900' },
      { rank: 2, label: '2nd place', amountSOL: 3, amountUSD: 450, reward: '$450' },
      { rank: 3, label: '3rd place', amountSOL: 1.5, amountUSD: 225, reward: '$225' },
    ],
    reward: '10.5 SOL pool', rewardUSD: 1575, rewardSOL: 10.5,
    tests: 0, requiredTier: 'expert',
    openTo: 'Open to proven builders — show us your best', deadline: '14 days',
    sponsorVerified: true,
    status: 'open',
    escrow: { state: 'held', amountSOL: 10.5, heldAt: new Date(), txSignature: globalEscrowSig, mock: true },
  });

  // Seed a genuine, DEEP field of submissions so the win is provably contested
  // — this is what lets a 1st-place credential land at proven_practitioner+.
  // A shallow/self-dealt field would mint near-worthless proof by contrast.
  const globalEntrants = extraStudents.slice(0, 10);
  for (let i = 0; i < globalEntrants.length; i++) {
    await seedApplication(globalBounty, globalEntrants[i], 'submitted', {
      submittedAt: new Date(),
      text: `Submission ${i + 1}: a working Solana payments demo with on-chain settlement and a live UI.`,
      links: ['https://github.com/demo/solana-pay', 'https://demo.app'],
    });
  }
  await Bounty.updateOne(
    { _id: globalBounty._id },
    { $set: { submissionCount: globalEntrants.length, applicantCount: globalEntrants.length, reviewDueAt: new Date(Date.now() + 72 * 3600 * 1000) } }
  );
  console.log(`[seed] created 1 global bounty with ${globalEntrants.length} submissions (leaderboard-ready)`);

  const totals = {
    users: await User.countDocuments({ email: new RegExp(`${DEMO_DOMAIN.replace('.', '\\.')}$`) }),
    credentials: await Credential.countDocuments({}),
  };
  console.log('\n[seed] ✅ done.');
  console.log('   Demo logins (password "demo1234" or the one-click buttons):');
  console.log('     • demo-student@credchain.demo');
  console.log('     • demo-issuer@credchain.demo');
  console.log('     • demo-employer@credchain.demo');
  console.log(`   Seeded demo users: ${totals.users}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
