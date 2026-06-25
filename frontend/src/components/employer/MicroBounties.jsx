import { MICRO_BOUNTIES } from '../../mock/data';
import { TIER_CONFIG } from '../../lib/credScore';

const STATUS_STYLE = {
  open:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  reviewing: 'bg-amber-50 text-amber-700 border-amber-200',
  closed:    'bg-gray-100 text-gray-500 border-gray-200',
};

export default function MicroBounties({ isEmployer = false }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Micro-Bounties</h3>
          <p className="mt-0.5 text-xs text-gray-500 max-w-lg">
            Post a skill challenge with automated tests. Verified students — including those currently in school — earn confirmed credentials for passing. You discover pre-tested talent before anyone else.
          </p>
        </div>
        {isEmployer && (
          <button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shrink-0">
            + Post a bounty
          </button>
        )}
      </div>

      {MICRO_BOUNTIES.map((b) => {
        const reqTier = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
        return (
          <article key={b.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{b.companyLogo}</span>
                  <span className="text-xs font-bold text-blue-600">{b.company}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[b.status] || STATUS_STYLE.open}`}>
                    {b.status}
                  </span>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600">
                    {reqTier.icon} {reqTier.label}+
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-bold text-gray-900">{b.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.skill}
                  {b.tests > 0 ? ` · ${b.tests} automated tests` : ' · Portfolio review'}
                  {b.deadline ? ` · ${b.deadline}` : ''}
                </p>
                <p className="mt-1.5 text-[11px] text-emerald-600 font-medium">{b.openTo}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-black text-gray-900">{b.reward}</p>
                <p className="text-[10px] text-gray-400">reward</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {(b.skillTags || []).map(tag => (
                <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{tag}</span>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
              <span className="text-blue-400">⬡</span>
              <span>Passing earns a Solana-anchored verified credential on completion</span>
            </div>
            <button className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100">
              View challenge →
            </button>
          </article>
        );
      })}

      <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
        <p className="text-sm font-semibold text-gray-700">Find talent before graduation day.</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
          Students build their verified record while still in school. Post a bounty and get first access — before they interview anywhere else.
        </p>
        {isEmployer && (
          <button className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            Post your first bounty →
          </button>
        )}
      </div>
    </div>
  );
}
