// ─────────────────────────────────────────────────────────────
// CredChain — Generalized Polymorphic Onboarding: Institution Types A–E
//
// The fields an issuer must supply CHANGE based on the type they pick.
// Legitimacy is judged by "is this a real, identifiable, accountable
// entity" — never by fame — so each type has a real, checkable path in,
// regardless of size or country.
//
//   backendType → maps onto the locked IssuerProfile.institutionType enum
//                 ('university' | 'bootcamp' | 'company' | 'certifier' | 'other').
//   verifyPath  → 'domain'  : DNS-funnel path (register-step-one → verify-domain
//                              → KYC → admin vetting). Requires an org-domain email.
//                 'github'  : OAuth "Connect GitHub Organization" path.
//                 'manual'  : external-footprint manual review (Type C, and the
//                              graceful-degradation fallback for any country
//                              without an automated module).
//   fields      → declarative inputs. `source` pulls its label/placeholder from
//                 the active Country Module (so the SAME field renders as
//                 "OPE ID" in the US and "NUC/JAMB Code" in Nigeria).
// ─────────────────────────────────────────────────────────────

export const INSTITUTION_TYPES = [
  {
    key: 'A',
    backendType: 'university',
    title: 'Accredited Educational Institution',
    blurb: 'Universities, colleges, polytechnics — at any level, in any country.',
    icon: '🎓',
    verifyPath: 'domain',
    fields: [
      { name: 'orgName', label: 'Institution name', type: 'text', placeholder: 'e.g. University of Lagos', required: true },
      { name: 'domainEmail', label: 'Official registrar / administrator email', type: 'email', placeholder: 'registrar@unilag.edu.ng', required: true, note: 'Must be on the institution domain — consumer inboxes (Gmail, Yahoo…) are rejected.' },
      { name: 'registryId', label: 'education', type: 'registry', required: true },
    ],
  },
  {
    key: 'B',
    backendType: 'bootcamp',
    title: 'Registered Training Provider / Bootcamp',
    blurb: 'Bootcamps, private academies, vocational training providers.',
    icon: '🏫',
    verifyPath: 'domain',
    kyb: true,
    fields: [
      { name: 'orgName', label: 'Business / academy name', type: 'text', placeholder: 'e.g. Decagon Institute Ltd', required: true },
      { name: 'domainEmail', label: 'Business domain email', type: 'email', placeholder: 'admin@decagon.dev', required: true, note: 'Consumer inboxes are rejected — use your business domain.' },
      { name: 'registryId', label: 'business', type: 'registry', required: true },
      { name: 'website', label: 'Business website', type: 'url', placeholder: 'https://…', required: true },
      { name: 'directorId', label: 'Director / principal full name', type: 'text', placeholder: 'Full legal name', required: true },
      { name: 'incorporationDocs', label: 'Incorporation document(s)', type: 'file', required: true, note: 'Certificate of incorporation / business registration. Renders a KYB review frame.' },
    ],
  },
  {
    key: 'C',
    backendType: 'other',
    title: 'Hackathon / Event / Informal Organizing Body',
    blurb: 'Real, identifiable organizers without formal registry paperwork. Public domains (Gmail) allowed — verified by footprint + review, not a registry lookup.',
    icon: '⚡',
    verifyPath: 'manual',
    allowConsumerEmail: true,
    fields: [
      { name: 'orgName', label: 'Event / organizer name', type: 'text', placeholder: 'e.g. Lagos DevFest 2026', required: true },
      { name: 'contactEmail', label: 'Organizer contact email', type: 'email', placeholder: 'team@…  (Gmail accepted)', required: true },
      { name: 'eventPlatformUrl', label: 'Event platform URL', type: 'url', placeholder: 'Devpost / Luma / Eventbrite / social handle', required: true },
      { name: 'footprintUrl', label: 'Additional public footprint (optional)', type: 'url', placeholder: 'Past event page, press, socials…', required: false },
    ],
  },
  {
    key: 'D',
    backendType: 'other',
    title: 'Open-Source Community / DAO',
    blurb: 'GitHub orgs and DAOs with real contributors. Verified via repo health + confirmed admin rights.',
    icon: '🐙',
    verifyPath: 'github',
    fields: [
      { name: 'orgName', label: 'Community / DAO name', type: 'text', placeholder: 'e.g. CHAOSS', required: true },
      { name: 'githubOrgUrl', label: 'GitHub organization / repo URL', type: 'url', placeholder: 'https://github.com/your-org', required: true },
      { name: 'minContributors', label: 'Approx. active contributors', type: 'number', placeholder: 'e.g. 25', required: true, note: 'Communities below the contributor threshold route to manual review.' },
    ],
  },
  {
    key: 'E',
    backendType: 'certifier',
    title: 'Professional / Certification Body',
    blurb: 'Engineering boards, medical councils, language-proficiency bodies — how many countries gate professions.',
    icon: '🏛️',
    verifyPath: 'domain',
    fields: [
      { name: 'orgName', label: 'Body name', type: 'text', placeholder: 'e.g. Council for the Regulation of Engineering (COREN)', required: true },
      { name: 'domainEmail', label: 'Official body domain email', type: 'email', placeholder: 'registrar@coren.gov.ng', required: true, note: 'Consumer inboxes are rejected.' },
      { name: 'registryId', label: 'professional', type: 'registry', required: true },
    ],
  },
];

export function getInstitutionType(key) {
  return INSTITUTION_TYPES.find((t) => t.key === key) || null;
}

// New issuers — especially Type B/C/E without an automated registry check —
// start at a lower default trust weight and earn upgrades over a clean track
// record. This is the honest answer to the cold-start problem.
export function startingTrustTier(typeKey, countryModule) {
  if (typeKey === 'A' && countryModule.automated) return { tier: 'T2 · Verified', weight: 'standard' };
  if (typeKey === 'E' && countryModule.automated) return { tier: 'T2 · Verified', weight: 'standard' };
  return { tier: 'T1 · Provisional', weight: 'reduced' };
}
