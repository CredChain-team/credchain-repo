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
import { useState, useMemo } from 'react';
import { TALENT_FEED, SKILL_CATEGORIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER, scoreBand } from '../../lib/credScore';

const ACADEMIC_FILTERS = [
  { value: 'all',          label: 'All students'        },
  { value: 'in_school',    label: '📚 Currently in school' },
  { value: 'nysc',         label: '🪖 NYSC'              },
  { value: 'graduate',     label: '🎓 Graduates'         },
  { value: 'professional', label: '💼 Professionals'     },
];

export default function TalentSearch({ onContact, onInviteToBounty }) {
  const [query,          setQuery]         = useState('');
  const [tierFilter,     setTierFilter]    = useState('all');
  const [statusFilter,   setStatusFilter]  = useState('all');
  const [categoryFilter, setCategoryFilter]= useState('all');
  const [deliveriesOnly, setDeliveriesOnly]= useState(false);
  const [minScore,       setMinScore]      = useState('');
  const [sortBy,         setSortBy]        = useState('score');
  const [expanded,       setExpanded]      = useState(null);

  const results = useMemo(() => {
    let pool = TALENT_FEED.filter(s => s.discoverable !== false);

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
  }, [query, tierFilter, statusFilter, categoryFilter, deliveriesOnly, minScore, sortBy]);

  const inSchoolCount = results.filter(s => s.academicStatus === 'in_school').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Search Verified Talent 🔍
            </h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed max-w-xl">
              Every profile here has at least one Solana-anchored credential.
              Search by skill, tier, or delivery history.
              <strong className="text-blue-700"> You can hire talent before they graduate.</strong>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-blue-600">{results.length}</p>
            <p className="text-xs text-gray-500">verified profiles</p>
            {inSchoolCount > 0 && (
              <p className="text-[11px] text-indigo-500 font-medium mt-0.5">
                {inSchoolCount} currently in school
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search by skill, name, university, e.g. 'React Lagos' or 'SQL data analyst'"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {query && (
          <button onClick={() => setQuery('')}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-gray-500 hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tier filter */}
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none">
          <option value="all">All tiers</option>
          {TIER_ORDER.map(t => (
            <option key={t} value={t}>{TIER_CONFIG[t]?.icon} {TIER_CONFIG[t]?.label}+</option>
          ))}
        </select>

        {/* Academic status */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none">
          {ACADEMIC_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Skill category */}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-400 focus:outline-none">
          <option value="all">All skills</option>
          {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Min CredScore */}
        <input type="number" placeholder="Min CredScore"
          value={minScore} onChange={e => setMinScore(e.target.value)}
          min="300" max="850"
          className="w-32 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-400 focus:outline-none" />

        {/* Has deliveries toggle */}
        <button onClick={() => setDeliveriesOnly(!deliveriesOnly)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${deliveriesOnly ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
          {deliveriesOnly ? '✓ Paid deliveries only' : 'Has paid deliveries'}
        </button>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Sort:</span>
          {[['score', 'CredScore'], ['deliveries', 'Deliveries'], ['tier', 'Tier']].map(([val, lab]) => (
            <button key={val} onClick={() => setSortBy(val)}
              className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors ${sortBy === val ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}>
              {lab}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-sm font-semibold text-gray-600">No verified students match this search</p>
          <p className="mt-1 text-xs text-gray-400">Try broader filters or a different skill term</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((student) => (
            <TalentCard key={student.id} student={student} expanded={expanded === student.id}
              onToggle={() => setExpanded(expanded === student.id ? null : student.id)}
              onContact={() => onContact?.(student)}
              onInvite={() => onInviteToBounty?.(student)} />
          ))}
        </div>
      )}

      {/* Recruiting insight */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
        <p className="text-xs font-bold text-gray-700">
          🎓 Hire before graduation day
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[11px] text-gray-500">
          Students build their CredScore and delivery record while still in school.
          Post a bounty to find and test talent before anyone else does.
        </p>
      </div>
    </div>
  );
}

function TalentCard({ student, expanded, onToggle, onContact, onInvite }) {
  const band     = scoreBand(student.credScore);
  const tierConf = TIER_CONFIG[student.highestTier] || TIER_CONFIG.learner;
  const inSchool = student.academicStatus === 'in_school';

  return (
    <article className={`rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${expanded ? 'border-blue-200' : 'border-gray-200'}`}>
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 text-base font-bold text-indigo-700">
            {student.name.charAt(0)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{student.name}</span>
              <span className="text-sm">{student.flag}</span>
              {student.globalTrustPass && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  ✓ Global Trust Pass
                </span>
              )}
              {inSchool && (
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                  📚 In school Y{student.yearOfStudy}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{student.headline}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className={`text-lg font-black ${band.text}`}>{student.credScore}</p>
            <p className="text-[10px] text-gray-400">CredScore</p>
          </div>
        </div>

        {/* Tier + stats row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">
            {tierConf.icon} {tierConf.label}
          </span>
          <span className="text-[11px] text-gray-400">
            {student.deliveries} paid {student.deliveries === 1 ? 'delivery' : 'deliveries'}
          </span>
          {student.totalEarnedSOL > 0 && (
            <span className="text-[11px] text-blue-500 font-medium">
              ◎ {student.totalEarnedSOL} SOL earned
            </span>
          )}
        </div>

        {/* Skill tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(student.skillTags || []).slice(0, 4).map(tag => (
            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{tag}</span>
          ))}
          {(student.skillTags || []).length > 4 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              +{student.skillTags.length - 4} more
            </span>
          )}
        </div>
      </button>

      {/* Expanded: full credential list + actions */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Verified Credentials
          </p>
          <div className="space-y-2">
            {(student.verified || []).map((cred, i) => {
              const ct = TIER_CONFIG[cred.tier] || TIER_CONFIG.learner;
              return (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="mt-0.5 text-sm">{ct.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900">{cred.title}</p>
                    <p className="text-[11px] text-gray-500">{cred.issuer}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-medium" style={{ color: ct.color }}>{ct.label}</span>
                      {cred.onChain && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-500">
                          ⬡ On Solana
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
              <p className="text-[11px] font-semibold text-gray-400 mb-1">Self-reported (unverified)</p>
              <div className="flex flex-wrap gap-1">
                {student.sandbox.map((s, i) => (
                  <span key={i} className="rounded-full border border-dashed border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-500">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button onClick={onContact}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors">
              Send message →
            </button>
            <button onClick={onInvite}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
              Invite to bounty
            </button>
            <a href={`/verify/student/${student.id}`} target="_blank" rel="noreferrer"
              className="ml-auto text-[11px] text-blue-500 hover:text-blue-700">
              🔍 Verify credentials →
            </a>
          </div>
        </div>
      )}
    </article>
  );
}
