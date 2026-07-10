/**
 * CredChain — Talent Search & Discovery
 *
 * The employer-side economy layer.
 * Employers search by skill, tier, CredScore, location, and academic status.
 * They see verified students — including those currently in school —
 * and can send a message, invite to a bounty, or request a credential check.
 *
 * This is the piece that makes CredChain a two-sided marketplace,
 * not just a student certificate storage app.
 */
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, GraduationCap, Hexagon, ExternalLink, MessageSquare, Target, ShieldCheck, BookOpen, Star } from 'lucide-react';
import { TALENT_FEED, SKILL_CATEGORIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER, scoreBand } from '../../lib/credScore';
import { searchTalent } from '../../services/api';
import { Card, Badge, Button, Input, Select } from '../ui';
import AssignTaskModal from './AssignTaskModal';
import { stagger, staggerItem } from '../../theme/motion';

// Country code → flag emoji for the talent card.
const COUNTRY_FLAG = { NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', ZA: '🇿🇦', US: '🇺🇸', GB: '🇬🇧' };

// Adapt a server StudentProfile (populated userId + verifiedSkills) into the
// flat shape TalentCard renders.
function adaptProfile(p) {
  const user = p.userId && typeof p.userId === 'object' ? p.userId : {};
  return {
    id: user._id || p.userId,
    name: user.name || 'Student',
    flag: COUNTRY_FLAG[p.location?.country] || '',
    headline: p.headline || '',
    credScore: p.credScore?.value ?? 300,
    highestTier: p.highestTier || 'learner',
    academicStatus: p.academicStatus || 'in_school',
    yearOfStudy: p.yearOfStudy,
    university: p.university,
    course: p.course,
    deliveries: p.deliveryStats?.completed || 0,
    totalEarnedSOL: p.deliveryStats?.totalEarnedSOL || 0,
    ratingAvg: p.ratingAvg || 0,
    ratingCount: p.ratingCount || 0,
    skillTags: p.skillTags || [],
    skillCategories: p.skillCategories || [],
    discoverable: true,
    verified: (p.verifiedSkills || []).map((c) => ({
      title: c.title,
      issuer: c.issuer || 'Verified Issuer',
      tier: c.trustTier || 'learner',
      onChain: Boolean(c.solanaTxSignature || c.txSignature),
    })),
    sandbox: [],
  };
}

const ACADEMIC_FILTERS = [
  { value: 'all',          label: 'All students'        },
  { value: 'in_school',    label: '📚 Currently in school' },
  { value: 'nysc',         label: '🪖 NYSC'              },
  { value: 'graduate',     label: '🎓 Graduates'         },
  { value: 'professional', label: '💼 Professionals'     },
];

const SORT_OPTIONS = [['score', 'CredScore'], ['deliveries', 'Deliveries'], ['tier', 'Tier']];

export default function TalentSearch({ onContact, onInviteToBounty }) {
  const [query,          setQuery]         = useState('');
  const [tierFilter,     setTierFilter]    = useState('all');
  const [statusFilter,   setStatusFilter]  = useState('all');
  const [categoryFilter, setCategoryFilter]= useState('all');
  const [deliveriesOnly, setDeliveriesOnly]= useState(false);
  const [minScore,       setMinScore]      = useState('');
  const [sortBy,         setSortBy]        = useState('score');
  const [expanded,       setExpanded]      = useState(null);
  const [feed,           setFeed]          = useState(TALENT_FEED);
  const [assignTo,       setAssignTo]      = useState(null); // student being assigned a direct task

  // Load real verified students once; keep the rich client-side filtering
  // below. Falls back to the mock feed if the request fails or returns none.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await searchTalent({ limit: 50 });
        const students = (data?.students || []).map(adaptProfile);
        if (alive && students.length) setFeed(students);
      } catch {
        /* keep the mock feed — the tab is never empty */
      }
    })();
    return () => { alive = false; };
  }, []);

  const results = useMemo(() => {
    let pool = feed.filter(s => s.discoverable !== false);

    // Free text: search name, headline, skill tags, university
    if (query.trim()) {
      const terms = query.toLowerCase().split(' ').filter(Boolean);
      pool = pool.filter(s =>
        terms.some(t =>
          s.name?.toLowerCase().includes(t) ||
          s.headline?.toLowerCase().includes(t) ||
          (s.skillTags || []).some(tag => tag.toLowerCase().includes(t)) ||
          s.university?.toLowerCase().includes(t) ||
          s.course?.toLowerCase().includes(t)
        )
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      const minIdx = TIER_ORDER.indexOf(tierFilter);
      pool = pool.filter(s => TIER_ORDER.indexOf(s.highestTier || 'learner') >= minIdx);
    }

    // Academic status filter
    if (statusFilter !== 'all') {
      pool = pool.filter(s => s.academicStatus === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      pool = pool.filter(s => (s.skillCategories || []).includes(categoryFilter));
    }

    // Has confirmed deliveries
    if (deliveriesOnly) {
      pool = pool.filter(s => (s.deliveries || 0) >= 1);
    }

    // Minimum CredScore
    if (minScore && !isNaN(parseInt(minScore))) {
      pool = pool.filter(s => s.credScore >= parseInt(minScore));
    }

    // Sort
    if (sortBy === 'score')       pool = [...pool].sort((a, b) => b.credScore - a.credScore);
    if (sortBy === 'deliveries')  pool = [...pool].sort((a, b) => b.deliveries - a.deliveries);
    if (sortBy === 'tier') {
      pool = [...pool].sort((a, b) =>
        TIER_ORDER.indexOf(b.highestTier || 'learner') - TIER_ORDER.indexOf(a.highestTier || 'learner')
      );
    }

    return pool;
  }, [feed, query, tierFilter, statusFilter, categoryFilter, deliveriesOnly, minScore, sortBy]);

  const inSchoolCount = results.filter(s => s.academicStatus === 'in_school').length;

  return (
    <div className="space-y-5">
      {/* Header — dark premium banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-[#0f1e35] p-6 shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-white">
              <ShieldCheck className="h-5 w-5 text-brand-300" /> Search verified talent
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
              Everyone here has at least one verified skill you can trust. Search by skill, level, or work history.
              <strong className="text-white"> You can hire great people before they even graduate.</strong>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tnum text-4xl font-black leading-none text-white">{results.length}</p>
            <p className="mt-1 text-xs text-slate-400">verified profiles</p>
            {inSchoolCount > 0 && (
              <p className="mt-1 text-[11px] font-medium text-brand-300">
                {inSchoolCount} currently in school
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by skill, name, university, e.g. 'React Lagos' or 'SQL data analyst'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            leftIcon={<Search />}
          />
        </div>
        {query && (
          <Button variant="outline" size="md" onClick={() => setQuery('')} leftIcon={<X className="h-4 w-4" />}>
            Clear
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tier filter */}
        <Select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="all">All tiers</option>
          {TIER_ORDER.map(t => (
            <option key={t} value={t}>{TIER_CONFIG[t]?.icon} {TIER_CONFIG[t]?.label}+</option>
          ))}
        </Select>

        {/* Academic status */}
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 w-auto text-xs">
          {ACADEMIC_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </Select>

        {/* Skill category */}
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 w-auto text-xs">
          <option value="all">All skills</option>
          {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>

        {/* Min CredScore */}
        <input
          type="number"
          placeholder="Min CredScore"
          value={minScore}
          onChange={e => setMinScore(e.target.value)}
          min="300"
          max="850"
          className="h-9 w-32 rounded-md border border-border-subtle bg-bg-elevated px-3 text-xs text-content-primary placeholder:text-content-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {/* Has deliveries toggle */}
        <button
          onClick={() => setDeliveriesOnly(!deliveriesOnly)}
          className={`h-9 rounded-md border px-3 text-xs font-semibold transition-colors ${
            deliveriesOnly
              ? 'border-brand-300 bg-brand-soft text-brand-700 dark:text-brand-300'
              : 'border-border-subtle bg-bg-elevated text-content-secondary hover:bg-bg-sunken'
          }`}
        >
          {deliveriesOnly ? '✓ Paid deliveries only' : 'Has paid deliveries'}
        </button>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-content-muted">Sort:</span>
          {SORT_OPTIONS.map(([val, lab]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                sortBy === val
                  ? 'border-brand-300 bg-brand-soft text-brand-700 dark:text-brand-300'
                  : 'border-border-subtle bg-bg-elevated text-content-muted hover:bg-bg-sunken'
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm font-semibold text-content-secondary">No verified students match this search</p>
          <p className="mt-1 text-xs text-content-muted">Try broader filters or a different skill term</p>
        </Card>
      ) : (
        <motion.div variants={stagger(0.04)} initial="initial" animate="animate" className="grid gap-3 md:grid-cols-2">
          {results.map((student) => (
            <motion.div key={student.id} variants={staggerItem}>
              <TalentCard
                student={student}
                expanded={expanded === student.id}
                onToggle={() => setExpanded(expanded === student.id ? null : student.id)}
                onContact={() => onContact?.(student)}
                onInvite={() => setAssignTo(student)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Recruiting insight */}
      <Card className="bg-bg-sunken p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-content-primary">
          <GraduationCap className="h-4 w-4 text-brand-600" /> Hire before graduation day
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[11px] text-content-secondary">
          Students build their CredScore and delivery record while still in school.
          Post a bounty to find and test talent before anyone else does.
        </p>
      </Card>

      {/* Direct "live task" assignment */}
      <AssignTaskModal
        student={assignTo}
        onClose={() => setAssignTo(null)}
        onAssigned={() => setAssignTo(null)}
      />
    </div>
  );
}

function TalentCard({ student, expanded, onToggle, onContact, onInvite }) {
  const band     = scoreBand(student.credScore);
  const tierConf = TIER_CONFIG[student.highestTier] || TIER_CONFIG.learner;
  const inSchool = student.academicStatus === 'in_school';

  return (
    <Card padding="none" selected={expanded} className="h-full overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-base font-bold text-white">
            {student.name.charAt(0)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-content-primary">{student.name}</span>
              <span className="text-sm">{student.flag}</span>
              {student.globalTrustPass && (
                <Badge tone="success" variant="soft" size="sm" icon={<ShieldCheck />}>Global Trust Pass</Badge>
              )}
              {inSchool && (
                <Badge tone="violet" variant="soft" size="sm" icon={<BookOpen />}>In school Y{student.yearOfStudy}</Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-content-muted">{student.headline}</p>
          </div>

          {/* Compact score pill */}
          <div className="shrink-0 text-right">
            <span
              className="tnum inline-block rounded-lg px-2 py-1 text-lg font-black leading-none"
              style={{ color: band.color, background: `${band.color}1f` }}
            >
              {student.credScore}
            </span>
            <p className="mt-1 text-[10px] text-content-muted">CredScore</p>
          </div>
        </div>

        {/* Tier + stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-[11px] font-semibold text-content-secondary">
            {tierConf.icon} {tierConf.label}
          </span>
          <span className="text-[11px] text-content-muted">
            {student.deliveries} paid {student.deliveries === 1 ? 'delivery' : 'deliveries'}
          </span>
          {student.totalEarnedSOL > 0 && (
            <span className="text-[11px] font-medium text-brand-600">
              ◎ {student.totalEarnedSOL} SOL earned
            </span>
          )}
          {student.ratingCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-500">
              <Star className="h-3 w-3 fill-current" /> {student.ratingAvg} ({student.ratingCount})
            </span>
          )}
        </div>

        {/* Skill tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(student.skillTags || []).slice(0, 4).map(tag => (
            <span key={tag} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-secondary">{tag}</span>
          ))}
          {(student.skillTags || []).length > 4 && (
            <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-muted">
              +{student.skillTags.length - 4} more
            </span>
          )}
        </div>
      </button>

      {/* Expanded: full credential list + actions */}
      {expanded && (
        <div className="border-t border-border-subtle px-4 pb-4 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted">
            Verified Credentials
          </p>
          <div className="space-y-2">
            {(student.verified || []).map((cred, i) => {
              const ct = TIER_CONFIG[cred.tier] || TIER_CONFIG.learner;
              return (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2">
                  <span className="mt-0.5 text-sm">{ct.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-content-primary">{cred.title}</p>
                    <p className="text-[11px] text-content-muted">{cred.issuer}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-medium" style={{ color: ct.color }}>{ct.label}</span>
                      {cred.onChain && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-600">
                          <Hexagon className="h-2.5 w-2.5" /> On Solana
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {student.sandbox?.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-semibold text-content-muted">Self-reported (unverified)</p>
              <div className="flex flex-wrap gap-1">
                {student.sandbox.map((s, i) => (
                  <span key={i} className="rounded-full border border-dashed border-border-subtle bg-bg-elevated px-2 py-0.5 text-[10px] text-content-muted">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onContact} leftIcon={<MessageSquare className="h-4 w-4" />}>
              Send message
            </Button>
            <Button size="sm" variant="secondary" onClick={onInvite} leftIcon={<Target className="h-4 w-4" />}>
              Assign a task
            </Button>
            <a
              href={`/verify/student/${student.id}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700"
            >
              <ExternalLink className="h-3 w-3" /> Verify credentials
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
