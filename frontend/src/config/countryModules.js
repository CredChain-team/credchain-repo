// ─────────────────────────────────────────────────────────────
// CredChain — Country Verification Module registry (Section 6)
//
// Every country-specific check (education-regulator ID, business registry,
// national ID format, academic domain suffix) lives HERE as per-country
// config — never hardcoded in component logic. This is the literal
// mechanism behind "Nigeria first, global after": add a module, get a
// country; until a country has an `automated` module, onboarding for it
// gracefully falls back to manual review + external-footprint check
// (the same path Type C already uses) rather than blocking.
//
// For the hackathon, NIGERIA is the only FULLY automated module
// (JAMB/NUC + OPEID, CAC, NIN). Other countries are intentionally left on
// the manual-review fallback to demonstrate graceful degradation.
// ─────────────────────────────────────────────────────────────

// Shape of a fully-specified module (mirrors the spec's example JSON).
//   automated            → true ⇒ registry IDs are (notionally) machine-checkable
//                          and the DNS-funnel path is offered; false ⇒ manual review.
//   educationRegistry    → Type A & E (academic) regulator id metadata
//   businessRegistry     → Type B (bootcamp/provider) corporate registration
//   professionalRegistry → Type E (professional/certification bodies)
//   nationalId           → Global Trust Pass national-ID hash input
//   domainSuffix         → hint used to nudge Type A toward an academic domain

export const COUNTRY_MODULES = {
  NG: {
    countryCode: 'NG',
    countryName: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    automated: true,
    educationRegistry: {
      type: 'JAMB_NUC_OPEID',
      idLabel: 'NUC / JAMB Institution Code',
      placeholder: 'e.g. 0001 (University of Lagos)',
      apiAvailable: true,
    },
    businessRegistry: {
      type: 'CAC',
      idLabel: 'CAC RC Number',
      placeholder: 'e.g. RC 1234567',
      apiAvailable: true,
    },
    professionalRegistry: {
      type: 'COREN_MDCN_NMA',
      idLabel: 'Professional Body Registration No.',
      placeholder: 'e.g. COREN R.12345',
      apiAvailable: true,
    },
    nationalId: {
      type: 'NIN',
      idLabel: 'National Identity Number (NIN)',
      placeholder: '11-digit NIN',
      apiAvailable: true,
    },
    domainSuffix: '.edu.ng',
  },

  // Registry *types* are known, but no live API integration yet → these stay
  // on manual review. They exist to prove the module pattern scales beyond NG.
  US: {
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    automated: false,
    educationRegistry: { type: 'OPEID', idLabel: 'OPE ID', placeholder: 'e.g. 00123400', apiAvailable: false },
    businessRegistry: { type: 'EIN', idLabel: 'EIN / State Reg. No.', placeholder: 'e.g. 12-3456789', apiAvailable: false },
    professionalRegistry: { type: 'STATE_BOARD', idLabel: 'State Board License No.', placeholder: 'e.g. PE-123456', apiAvailable: false },
    nationalId: { type: 'SSN_LAST4', idLabel: 'Govt ID (last 4)', placeholder: 'last 4 digits', apiAvailable: false },
    domainSuffix: '.edu',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    automated: false,
    educationRegistry: { type: 'OFS', idLabel: 'OfS Register Number', placeholder: 'e.g. 10007783', apiAvailable: false },
    businessRegistry: { type: 'COMPANIES_HOUSE', idLabel: 'Companies House Number', placeholder: 'e.g. 01234567', apiAvailable: false },
    professionalRegistry: { type: 'PRO_BODY', idLabel: 'Professional Body Reg. No.', placeholder: 'e.g. MEng 12345', apiAvailable: false },
    nationalId: { type: 'PASSPORT', idLabel: 'Passport Number', placeholder: 'passport no.', apiAvailable: false },
    domainSuffix: '.ac.uk',
  },
  KE: {
    countryCode: 'KE',
    countryName: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    automated: false,
    educationRegistry: { type: 'CUE', idLabel: 'CUE Accreditation No.', placeholder: 'e.g. CUE/UNI/2020', apiAvailable: false },
    businessRegistry: { type: 'BRS', idLabel: 'BRS Registration No.', placeholder: 'e.g. PVT-ABC123', apiAvailable: false },
    professionalRegistry: { type: 'PRO_BODY', idLabel: 'Professional Body Reg. No.', placeholder: 'reg. no.', apiAvailable: false },
    nationalId: { type: 'HUDUMA', idLabel: 'Huduma / National ID', placeholder: 'ID number', apiAvailable: false },
    domainSuffix: '.ac.ke',
  },
};

// The fallback every unconfigured country resolves to: manual review only.
export const FALLBACK_MODULE = {
  automated: false,
  educationRegistry: { type: 'MANUAL', idLabel: 'Accreditation / Registry ID (if any)', placeholder: 'optional', apiAvailable: false },
  businessRegistry: { type: 'MANUAL', idLabel: 'Business Registration No. (if any)', placeholder: 'optional', apiAvailable: false },
  professionalRegistry: { type: 'MANUAL', idLabel: 'Professional Body Reg. No. (if any)', placeholder: 'optional', apiAvailable: false },
  nationalId: { type: 'MANUAL', idLabel: 'National ID / Passport No.', placeholder: 'id / passport', apiAvailable: false },
  domainSuffix: '',
};

// Browsable list for the country <select>. Any code not in COUNTRY_MODULES
// resolves to the fallback (manual review) via getCountryModule().
export const SUPPORTED_COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'OTHER', name: 'Other / Not listed', flag: '🌍' },
];

// Resolve a country's module, falling back to manual review when unconfigured.
export function getCountryModule(code) {
  const mod = COUNTRY_MODULES[code];
  if (mod) return mod;
  return { ...FALLBACK_MODULE, countryCode: code || 'OTHER', countryName: 'Unconfigured region', flag: '🌍', currency: '' };
}
