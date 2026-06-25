# CredChain — Exhaustive UI/UX Build Spec

> Companion to `DEMO_READY_PROMPT.md`. This file is the **deep UI directive**: exact design tokens,
> per-component prop APIs, copy-paste Framer Motion variants, Tailwind config, and wireframe-level layouts
> for every screen across all three portals + the landing page.
>
> Feed this to Claude Code AFTER the Phase 0/1 audit. Instruction to the model:
> **"Implement the CredChain UI exactly to this spec. Build the design system first (Section A), then the
> primitives (Section B), then the shell (Section C), then each screen (Sections D–G). Match the tokens,
> component APIs, motion, and layouts precisely. Reuse existing libs where present; otherwise install
> Tailwind CSS, Framer Motion, lucide-react, and clsx. Build in light + dark mode from the start."**

---

# SECTION A — DESIGN SYSTEM (build first, single source of truth)

## A.1 Brand & art direction

- **Personality:** trustworthy, modern, slightly futuristic fintech. Think Stripe × Linear × a crypto-native
  product that doesn't look like a crypto product. Clean, confident, calm. Motion that feels physical, never bouncy-cartoonish.
- **Signature visual motif:** the "verified" moment — a credential being cryptographically anchored. Use a
  recurring **shield/check + subtle chain-link** motif and an **indigo→violet gradient** for hero/brand surfaces.
- **Light mode is primary** (judges demo in bright rooms); dark mode fully supported.

## A.2 Color tokens (exact hex)

Define as CSS variables + Tailwind theme. Never hardcode hex in components — use semantic tokens.

```css
/* === BRAND === */
--brand-50:  #EEF2FF;
--brand-100: #E0E7FF;
--brand-200: #C7D2FE;
--brand-300: #A5B4FC;
--brand-400: #818CF8;
--brand-500: #6366F1;   /* primary */
--brand-600: #4F46E5;   /* primary-strong (buttons, links) */
--brand-700: #4338CA;
--brand-800: #3730A3;
--brand-900: #312E81;

/* === ACCENT / VERIFIED (emerald) === */
--accent-400: #34D399;
--accent-500: #10B981;  /* success / verified / earned */
--accent-600: #059669;

/* === VIOLET (gradient partner) === */
--violet-500: #8B5CF6;
--violet-600: #7C3AED;

/* === STATUS === */
--warning-500: #F59E0B;  /* pending */
--danger-500:  #F43F5E;  /* revoked / error */
--info-500:    #0EA5E9;

/* === NEUTRALS (slate ramp) === */
--gray-50:  #F8FAFC;
--gray-100: #F1F5F9;
--gray-200: #E2E8F0;
--gray-300: #CBD5E1;
--gray-400: #94A3B8;
--gray-500: #64748B;
--gray-600: #475569;
--gray-700: #334155;
--gray-800: #1E293B;
--gray-900: #0F172A;
--gray-950: #020617;

/* === SEMANTIC (light mode) === */
--bg-base:        var(--gray-50);
--bg-elevated:    #FFFFFF;
--bg-sunken:      var(--gray-100);
--bg-brand-soft:  var(--brand-50);
--border-subtle:  var(--gray-200);
--border-strong:  var(--gray-300);
--text-primary:   var(--gray-900);
--text-secondary: var(--gray-600);
--text-muted:     var(--gray-400);
--text-on-brand:  #FFFFFF;
--ring:           var(--brand-500);

/* === SEMANTIC (dark mode — html.dark) === */
--bg-base:        var(--gray-950);
--bg-elevated:    var(--gray-900);
--bg-sunken:      #0B1220;
--bg-brand-soft:  rgba(99,102,241,0.12);
--border-subtle:  rgba(148,163,184,0.14);
--border-strong:  rgba(148,163,184,0.24);
--text-primary:   var(--gray-50);
--text-secondary: var(--gray-300);
--text-muted:     var(--gray-500);
```

**Gradients (reusable utility classes):**
```
--grad-brand:   linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
--grad-verified:linear-gradient(135deg, #10B981 0%, #34D399 100%);
--grad-hero:    radial-gradient(1200px 600px at 70% -10%, rgba(124,58,237,.25), transparent),
                radial-gradient(900px 500px at 10% 10%, rgba(99,102,241,.18), transparent);
--grad-mesh:    conic-gradient(from 180deg at 50% 50%, #6366F1, #8B5CF6, #10B981, #6366F1);
```

## A.3 Trust-tier & CredScore color mapping

**Trust tiers** (issuer + holder): give each a distinct, legible color + label + icon.
```
Tier 0 / Unverified  → gray-400,   icon: circle-dashed
Tier 1 / Basic       → info-500,   icon: shield
Tier 2 / Verified    → brand-600,  icon: shield-check
Tier 3 / Trusted     → violet-600, icon: badge-check
Tier 4 / Elite       → accent-500, icon: crown  (gradient pill)
```

**CredScore bands** (0–1000 scale, drive the gauge color):
```
0–399    Building    → gray-400
400–599  Emerging    → info-500
600–749  Strong      → brand-600
750–899  Excellent   → violet-600
900–1000 Exceptional → accent-500 (gradient)
```

## A.4 Typography

- **Font:** `Inter` (variable) for UI; `Plus Jakarta Sans` optional for display headings. Self-host or
  `@fontsource`. `font-feature-settings: "cv11","ss01"; font-variant-numeric: tabular-nums;` for numbers.

```
display    : 56/60, weight 800, tracking -0.02em   (hero only)
h1         : 36/40, 700, -0.02em
h2         : 28/34, 700, -0.01em
h3         : 22/28, 600
h4         : 18/24, 600
body-lg    : 17/26, 400
body       : 15/22, 400
body-sm    : 13/18, 400
caption    : 12/16, 500, tracking 0.01em
overline   : 11/14, 600, uppercase, tracking 0.08em
mono       : "JetBrains Mono" for hashes / tx IDs / IDs
```

## A.5 Spacing, radius, shadow, layout

```
SPACE (px): 2 4 6 8 12 16 20 24 32 40 48 64 80 96
RADIUS:     sm 8 · md 12 · lg 16 · xl 20 · 2xl 28 · full 9999
            (cards = lg, buttons = md, pills = full, modals = 2xl)

SHADOWS (soft, layered, slightly brand-tinted):
  shadow-sm : 0 1px 2px rgba(15,23,42,.06)
  shadow-md : 0 4px 12px rgba(15,23,42,.08)
  shadow-lg : 0 12px 28px rgba(15,23,42,.10)
  shadow-xl : 0 24px 48px rgba(15,23,42,.14)
  shadow-brand: 0 8px 24px rgba(99,102,241,.28)   /* primary CTA hover/glow */
  shadow-verified: 0 8px 24px rgba(16,185,129,.28)

LAYOUT:
  container max-width: 1200 (content), 1440 (app shell)
  sidebar width: 260 expanded / 72 collapsed
  topbar height: 64
  page gutter: 24 (mobile 16), 32 (xl)
  grid: 12-col, 24 gutter
```

## A.6 Motion system (Framer Motion presets — copy verbatim)

```js
// src/theme/motion.js
export const ease = {
  out: [0.16, 1, 0.3, 1],      // smooth decel — entrances
  inOut: [0.65, 0, 0.35, 1],   // moves
  spring: { type: "spring", stiffness: 380, damping: 30, mass: 0.8 },
};

export const dur = { micro: 0.15, base: 0.25, slow: 0.4 };

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit:    { opacity: 0, y: 8, transition: { duration: dur.micro } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: ease.spring },
  exit:    { opacity: 0, scale: 0.98, transition: { duration: dur.micro } },
};

export const stagger = (gap = 0.06) => ({
  animate: { transition: { staggerChildren: gap } },
});

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit:    { opacity: 0, y: -8, transition: { duration: dur.micro } },
};

// hover lift for cards/buttons
export const hoverLift = { whileHover: { y: -2 }, whileTap: { scale: 0.98 } };
```

**Rules:** always wrap route content in `<AnimatePresence mode="wait">`. Always honor
`useReducedMotion()` — when true, drop `y`/`scale` and keep only opacity. Count-up numbers use a
spring or `animate` from 0 on mount/in-view. Confetti only on issuance/verify success.

## A.7 Tailwind config (extend, don't replace)

```js
// tailwind.config.js — theme.extend
colors: { brand:{...A.2}, accent:{...}, violet:{...},
  bg:{base:'var(--bg-base)',elevated:'var(--bg-elevated)',sunken:'var(--bg-sunken)'},
  border:{subtle:'var(--border-subtle)',strong:'var(--border-strong)'},
  text:{primary:'var(--text-primary)',secondary:'var(--text-secondary)',muted:'var(--text-muted)'} },
borderRadius: { sm:'8px', md:'12px', lg:'16px', xl:'20px','2xl':'28px' },
boxShadow: { sm:'...', md:'...', lg:'...', xl:'...', brand:'...', verified:'...' },
fontFamily: { sans:['Inter','system-ui','sans-serif'], display:['Plus Jakarta Sans','Inter'], mono:['JetBrains Mono','monospace'] },
keyframes: { shimmer:{...}, 'count-up':{...} },
darkMode: 'class',
```

---

# SECTION B — COMPONENT PRIMITIVES (build + document each API)

Build in `src/components/ui/`. Each must support `className` override (merge via `clsx`/`cn`), be keyboard
accessible, have focus-visible rings (`ring-2 ring-brand-500 ring-offset-2`), and work in both themes.

### B.1 `Button`
```ts
Button({ variant?: 'primary'|'secondary'|'ghost'|'danger'|'outline',
         size?: 'sm'|'md'|'lg', loading?: boolean, leftIcon?, rightIcon?,
         fullWidth?: boolean, disabled?, as?: 'button'|'a', ...props })
```
- primary: `bg-brand-600 text-white`, hover `bg-brand-700 + shadow-brand`, `whileTap scale .98`.
- secondary: `bg-bg-sunken text-text-primary border border-border-subtle`.
- ghost: transparent, hover `bg-bg-sunken`. outline: border only. danger: `bg-danger-500`.
- loading: show spinner, keep width stable, disable pointer events.

### B.2 `Card`
```ts
Card({ interactive?: boolean, selected?: boolean, padding?: 'none'|'sm'|'md'|'lg', as?, ...})
```
- base: `bg-bg-elevated border border-border-subtle rounded-lg shadow-sm`.
- interactive: `hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer`.
- selected: `ring-2 ring-brand-500 border-brand-300`.

### B.3 Form controls — `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
```ts
Input({ label?, hint?, error?, leftIcon?, rightIcon?, required?, ...native })
```
- label above, hint below (muted), error replaces hint in `danger-500` + red ring.
- focus: `ring-2 ring-brand-500`. invalid: `border-danger-500`. disabled: reduced opacity + not-allowed.
- `Switch`: animated thumb (Framer `layout`), brand track when on.

### B.4 `Badge` / `Pill`
```ts
Badge({ tone:'neutral'|'brand'|'success'|'warning'|'danger'|'violet'|'info', variant:'soft'|'solid'|'outline', icon?, size:'sm'|'md', dot?:boolean })
```
- soft = tinted bg + colored text (default). Used for status (Verified/Pending/Revoked) + trust tiers.

### B.5 `Avatar`
```ts
Avatar({ src?, name, size:'xs'|'sm'|'md'|'lg'|'xl', ring?:boolean })
```
- fallback: initials on a deterministic gradient derived from name hash.

### B.6 `Modal` / `Dialog`
- `AnimatePresence` + `scaleIn` content, `fadeUp` backdrop (`bg-gray-950/50 backdrop-blur-sm`).
- focus-trap, ESC + backdrop click close, body scroll lock, `role="dialog" aria-modal`.

### B.7 `Toast` (provider + `useToast()`)
```ts
toast.success(msg, {description?}) | toast.error() | toast.info() | toast.promise(p,{loading,success,error})
```
- top-right stack, `scaleIn`, auto-dismiss 4s (errors 6s), swipe/click to dismiss, max 3 visible.

### B.8 `Tooltip`, `Tabs`, `DropdownMenu`, `Breadcrumbs` — standard accessible implementations.

### B.9 `Skeleton`
```ts
Skeleton({ variant:'text'|'rect'|'circle'|'card', w?, h?, lines? })
```
- shimmer animation. Build matching skeletons for: stat cards, tables, credential grid, profile.

### B.10 `EmptyState`
```ts
EmptyState({ icon, title, description, action? })
```
- centered, illustrated (lucide icon in a soft brand circle), muted copy, primary CTA.

### B.11 `StatCard`
```ts
StatCard({ label, value:number, delta?, icon, tone?, format?:'number'|'currency'|'percent' })
```
- animated count-up (0→value) on in-view via spring. delta shows ▲/▼ in accent/danger.

### B.12 `DataTable`
```ts
DataTable({ columns, rows, sortable?, selectable?, pagination?, onRowClick?, loading?, emptyState? })
```
- sticky header, row hover `bg-bg-sunken`, sort arrows, checkbox column, page controls, skeleton + empty.

### B.13 `RadialScore` (CredScore gauge) — centerpiece component
```ts
RadialScore({ score:number, max?:1000, segments?:{label,value,color}[], size?:number, animate?:boolean })
```
- SVG circular gauge, `stroke-dasharray` animated from 0 to score on mount (spring/`useSpring`).
- color = CredScore band (A.3). center: big count-up number + band label + tier badge.
- optional 4-segment ring or 4 mini-bars below for the 4 components; hovering a segment highlights it.

### B.14 `ProgressStepper`
```ts
Stepper({ steps:{label,icon}[], current:number })
```
- horizontal connector line fills with brand as you advance; completed = check, current = pulsing ring,
  upcoming = muted. Animated fill transition.

### B.15 `CredentialCard` — used in wallet + previews
```ts
CredentialCard({ credential, variant:'wallet'|'preview'|'compact', onClick? })
```
- shows SVG badge, title, issuer (+ verified check), date, type chip, on-chain "Verified" pill.
- `whileHover` tilt (rotateX/Y from pointer position, max 6deg) + glow; click → detail modal.

### B.16 `ConfettiBurst` + `SuccessCheck`
- `ConfettiBurst({fire})` canvas confetti on issuance/verify success.
- `SuccessCheck` animated SVG check that draws itself (`pathLength` 0→1) inside a pulsing accent circle.

### B.17 `ErrorBoundary` + `ErrorScreen`
- friendly fallback: icon, "Something went wrong", retry button, never a white screen.

### B.18 `OnChainProof`
```ts
OnChainProof({ txSignature, network, anchoredId, status:'anchored'|'mock'|'pending' })
```
- mono tx hash (truncated + copy), explorer link, network chip, animated "Anchored ✓" state.
- if `mock` (DEMO_MODE fallback): subtle "demo" tag, but still looks verified.

---

# SECTION C — APP SHELL (shared across the 3 authed portals)

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPBAR (h64, bg-elevated, border-b subtle)                        │
│  [logo] [portal name]      [⌘K search]   [🔔][🌗 theme][avatar▾]   │
├───────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR   │  PAGE AREA (bg-base, gutter 24)                        │
│ (260)     │  ┌ breadcrumbs ───────────────────────────────┐       │
│           │  │ Home / Section / Detail                      │       │
│ • Nav     │  └──────────────────────────────────────────────┘     │
│   items   │                                                        │
│ (role-    │   <AnimatePresence mode="wait"> page content </>       │
│  aware,   │                                                        │
│  active   │                                                        │
│  pill)    │                                                        │
│           │                                                        │
│ [collapse]│                                                        │
│ [user]    │                                                        │
└───────────┴──────────────────────────────────────────────────────┘
```
- **Sidebar:** brand logo top; role-aware nav items (icon + label, active = `bg-brand-soft text-brand-700`
  rounded-md + left accent bar); collapsible to 72px (icons only, tooltips on hover); user mini-card bottom.
- **Topbar:** global `⌘K` command palette (search credentials/people/actions), notifications popover,
  theme toggle (persist localStorage, no FOUC via inline script), avatar dropdown (profile, switch role in
  DEMO_MODE, logout).
- **Mobile (<1024):** sidebar → slide-in drawer (hamburger); topbar condensed; content full-width.
- **Route transitions:** wrap `<Outlet/>` in `motion.div` with `pageTransition`.
- **RBAC:** a `ProtectedRoute` wrapper redirects by role; show a tasteful 403 screen if mismatched.

---

# SECTION D — LANDING PAGE (`/`)

Full-bleed marketing page, scroll-animated, responsive. Sections top→bottom:

**D.1 Nav (sticky, transparent → solid on scroll)**
`[CredChain logo]      Features  How it works  For Issuers  ·  [Sign in] [Get started→]`

**D.2 Hero**
```
        ┌───────────────────────────────────────────────┐
        │  grad-hero background + slow-drifting blobs     │
        │                                                 │
        │    overline: ON-CHAIN VERIFIED CREDENTIALS      │
        │   display:  Credentials you own.                │
        │             Trust you can verify.               │
        │   body-lg (muted): Issue, hold, and verify      │
        │     tamper-proof credentials anchored on Solana.│
        │   [Get started →]  [Verify a credential]        │
        │   ▸ trust row: "Anchored on Solana · 3 portals" │
        │                                                 │
        │            [floating CredentialCard mockup,     │
        │             parallax tilt on mouse move,        │
        │             with an animated "Verified ✓" pill] │
        └───────────────────────────────────────────────┘
```
- headline words animate in with `stagger` + `fadeUp`. Mockup tilts via pointer (spring). Buttons hover-glow.

**D.3 Live stats band** — 3–4 `StatCard`s with count-up (credentials issued, issuers, verifications, avg CredScore), pulled from `/api/v1` stats or seed.

**D.4 How it works** — 3 steps (Issue → Anchor on-chain → Verify) as a horizontal flow with icons + a
connecting line that draws on scroll; each card `whileInView fadeUp` staggered.

**D.5 Three portals** — 3 large cards (Issuer / Student / Verifier): icon, title, one-liner, "Enter →".
hover lift + brand glow + subtle gradient border.

**D.6 Trust / security** — split layout: left copy ("Every credential is hashed and anchored to Solana via
the SPL Memo program — verifiable by anyone, owned by the holder"), right an animated `OnChainProof` visual.

**D.7 CredScore teaser** — show a `RadialScore` animating in-view + the 4 components explained.

**D.8 CTA band** — gradient (`grad-brand`) full-width, "Ready to issue your first credential?" + button.

**D.9 Footer** — columns (Product, Portals, Resources, Legal), GitHub, "Built for [hackathon]". theme toggle.

---

# SECTION E — ISSUER PORTAL

**E.1 Dashboard** (`/issuer`)
```
Row1: [StatCard Issued][StatCard Pending][StatCard Revoked][StatCard Holders]
Row2: [ Issuance over time — area chart (recharts) ........ ][ Trust tier
       brand-gradient stroke, last 30d                      ][ progress card:
                                                            ][ Tier 2→3, bar,
                                                            ][ "what's next" ]
Row3: [ Recent activity feed (issued/revoked, avatars, time-ago, status badges) ]
      [ Quick actions: Issue credential · Bulk upload · Manage ]
```

**E.2 Issue Credential — Types A–E Wizard** (`/issuer/issue`) — THE CENTERPIECE
- `ProgressStepper`: 1 Type · 2 Details · 3 Design · 4 Review & Anchor.
- **Step 1 — Type:** 5 selectable `Card`s (A–E) in a grid, each icon + name + description; selected =
  `ring-2 ring-brand-500`. Animate selection.
- **Step 2 — Details:** left = form (recipient name/email, credential title, skills, issue/expiry date,
  description) with inline validation; **right = sticky live `CredentialCard` preview** updating per keystroke.
- **Step 3 — Design/Badge:** pick badge style/color; live SVG badge regenerates; preview updates.
- **Step 4 — Review & Anchor:** summary + big **"Issue & Anchor on Solana"** button →
  animated sequence: `Hashing… → Submitting to Solana… → Anchored ✓` (each stage a checkmark draw) →
  `ConfettiBurst` + `SuccessCheck` + `OnChainProof` (tx link) + actions [Issue another][View credential].
- Step transitions: slide+fade (`AnimatePresence` direction-aware). Back/Next; "Save draft".

**E.3 Bulk issuance** (`/issuer/bulk`)
- Drag-drop CSV zone (dashed border, hover/active states) → parse → `DataTable` preview with per-row
  validation (green check / red error rows) → "Issue N" → live progress bar + per-row result + summary toast.

**E.4 Manage credentials** (`/issuer/credentials`)
- `DataTable` (recipient, title, type, date, status badge, actions). search + filter (status/type) + sort.
- Row click → right-side detail Drawer (full metadata + `OnChainProof`). **Revoke** → confirm Modal with
  reason field → row animates to "Revoked" + toast.

**E.5 Issuer onboarding funnel** (`/issuer/onboarding`)
- Stepper-driven profile setup → trust-tier verification; celebratory state on tier achieved.

---

# SECTION F — STUDENT / HOLDER PORTAL

**F.1 Dashboard** (`/student`)
```
┌─ Hero card (grad-brand-soft) ───────────────────────────────────┐
│  [ RadialScore gauge: big 0→score count-up, band label,          │
│    Tier badge ]      |  4 components as mini-bars w/ labels:      │
│                      |   • Credentials   ▓▓▓▓░  • Verifications…  │
│                      |   • Endorsements  ▓▓▓░░  • Activity…       │
│                      |  "Improve your score →" (links to Earn)    │
└──────────────────────────────────────────────────────────────────┘
Row: [StatCard Credentials][StatCard Verified][StatCard Pending][Tier]
Section: "Your wallet" preview grid (recent credentials) → "View all"
Section: "Next steps" — quest checklist preview
```
- gauge animates on load; tapping a component opens an explainer popover.

**F.2 Credential wallet** (`/student/wallet`)
- responsive grid of `CredentialCard` (tilt + glow on hover). filter by type/issuer/status; search.
- click → detail Modal: SVG badge, full metadata, issuer (+ verified), `OnChainProof`,
  [Share ▾: copy link · QR code · Download PDF (fpdf2)]. empty state if none.

**F.3 Earn tab** (`/student/earn`) — make it feel like leveling up
- quest/checklist board grouped by CredScore component; each item: title, points, progress, CTA; completing
  animates to ✓ + small confetti + score tick-up. "Verification pathways" roadmap visual.

**F.4 Public profile** (`/p/:handle`) — shareable, no auth
- avatar, name, CredScore gauge, trust tier, verified credential grid; "Verify any credential" CTA;
  clean, screenshot-worthy.

---

# SECTION G — VERIFIER / TALENT PORTAL

**G.1 Talent search** (`/verifier`)
```
[ search bar ⌘K-style, big ]   [filters: skill · trust tier · type · CredScore range slider]
Results grid/list of candidate cards:
  [avatar][name + handle]              [CredScore mini-gauge]
  [trust tier badge][top skills chips]
  [top 2 credential badges]           [View profile →]
skeletons while loading · EmptyState if none · sort + pagination
```

**G.2 Candidate profile** (`/verifier/talent/:id`)
- header (avatar, name, tier, CredScore gauge), verified-credentials grid, score breakdown, trust signals,
  [Shortlist][Contact]. each credential → on-chain proof.

**G.3 Verify a credential** (`/verifier/verify`) — the trust moment
- input: paste credential ID / tx / scan QR → big **Verify** button →
  animated sequence: `Reading credential… → Checking hash… → Confirming on Solana… → ✅ Verified`
  (staged checkmarks) → result card: VERIFIED (accent) / REVOKED (danger) / NOT FOUND, with issuer +
  trust tier + `OnChainProof` + revocation status. `SuccessCheck` on success. Make it feel authoritative.

**G.4 Shortlist** (`/verifier/shortlist`) — saved candidates, quick actions, notes.

---

# SECTION H — UNIVERSAL REQUIREMENTS (apply to every screen)

- **Three states everywhere:** loading (matching `Skeleton`), empty (`EmptyState` + CTA), error (inline + retry). NEVER a bare spinner on a full page, NEVER raw JSON, NEVER a broken image (fallbacks).
- **Every mutation** → loading state + `toast` (use `toast.promise` for async). optimistic where safe.
- **Responsive** 320 → 1440+. test mobile/tablet/desktop. no horizontal scroll, no layout shift.
- **Dark + light**, toggle persisted, no FOUC.
- **A11y:** semantic HTML, labelled inputs, `focus-visible` rings, full keyboard nav, AA contrast, `aria-*`
  on dialogs/menus/tabs, `prefers-reduced-motion` respected (drop transforms, keep opacity).
- **Micro-interactions:** button tap scale .98, card hover lift, input focus ring, route fade — consistent.
- **Perf:** lazy-load routes (`React.lazy`+Suspense w/ skeletons), memo heavy lists, debounce search (300ms),
  `content-visibility` on long lists, optimize SVG badges.
- **Empty-but-pretty:** with seed data nothing is empty during the demo, but states must still exist.

---

# SECTION I — IMPLEMENTATION ORDER (do in this sequence)

1. Tailwind config + CSS variables + fonts + theme toggle (light/dark, no FOUC).  → verify both themes render.
2. Motion presets + `cn()` util + `ErrorBoundary` + `ToastProvider`.
3. Primitives B.1–B.12 (+ Storybook-style demo page to eyeball them) → then B.13–B.18.
4. App shell (Section C) + routing + `ProtectedRoute` + page-transition wrapper.
5. Landing page (Section D) — biggest first-impression ROI.
6. Student dashboard + wallet (RadialScore + CredentialCard showcase).
7. Issuer wizard (the demo centerpiece) + dashboard + manage/revoke.
8. Verifier search + verify flow.
9. Bulk issuance, earn tab, public profile, shortlist.
10. Universal-states sweep (loading/empty/error on every screen) + a11y + responsive pass.
11. Wire all to real `/api/v1`; confirm with seed data; screenshot each key screen.

**Definition of done for UI:** every screen would look at home in a Linear / Stripe / Vercel product. If it
wouldn't, it's not done — polish spacing, hierarchy, motion, and states until it would.
