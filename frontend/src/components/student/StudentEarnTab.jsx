/**
 * CredChain — Student Earn Tab
 *
 * The in-school economy surface. Students see micro-bounties matched
 * to their verified skill tier. Their credential IS the application.
 * No CV. No cover letter. No "2 years experience required."
 * Payment locked in escrow before work begins.
 *
 * Data comes live from /api/v1/bounties (with this student's application
 * status per bounty). If the backend has no bounties yet, we fall back to
 * the MICRO_BOUNTIES mock so the tab is never empty on stage.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Lock, Hexagon, Target, Package, Coins, Award, Lightbulb, ArrowRight,
  Clock, Loader2, Send, Star,
} from 'lucide-react';
import { MICRO_BOUNTIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER, tierMeetsRequirement } from '../../lib/credScore';
import { Card, Badge, Button, Modal, Textarea, Input, EmptyState } from '../ui';
import GlobalChallenges from '../employer/GlobalChallenges';
import { stagger, staggerItem } from '../../theme/motion';

// Application-status → badge presentation.
const APP_STATUS = {
  invited:   { tone: 'brand',   label: 'Direct invite — respond', icon: <Target /> },
  applied:   { tone: 'warning', label: 'Applied — under review', icon: <Clock /> },
  accepted:  { tone: 'brand',   label: 'Accepted — deliver now', icon: <CheckCircle2 /> },
  delivered: { tone: 'violet',  label: 'Delivered — awaiting confirmation', icon: <Package /> },
  submitted: { tone: 'violet',  label: 'Submitted — in the running', icon: <Package /> },
  confirmed: { tone: 'success', label: 'Completed', icon: <Award /> },
  won:       { tone: 'success', label: 'Won', icon: <Award /> },
  declined:  { tone: 'neutral', label: 'Declined', icon: <Lock /> },
  rejected:  { tone: 'neutral', label: 'Not selected', icon: <Lock /> },
  not_selected: { tone: 'neutral', label: 'Not selected', icon: <Lock /> },
};

export default function StudentEarnTab({
  verified = [],
  credScore = 300,
  academicStatus = 'in_school',
  bounties = [],
  applications = [],
  onApply,
  onDeliver,
  onRespond,
  onRate,
}) {
  const [filter, setFilter] = useState('all');   // all | eligible
  const [view, setView] = useState('open');       // open | mine
  const [applyingId, setApplyingId] = useState(null);
  const [deliverFor, setDeliverFor] = useState(null); // application being delivered
  const [rateFor, setRateFor] = useState(null);        // application being rated

  // Live bounties if present, otherwise the mock so the stage is never empty.
  const source = bounties.length ? bounties : MICRO_BOUNTIES;

  // Direct invites awaiting a response bubble to the top as a call-to-action.
  const pendingInvites = applications.filter((a) => a.status === 'invited').length;

  const studentHighestTier = verified.reduce((best, v) => {
    const tier = v.trustTier || 'learner';
    return TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(best) ? tier : best;
  }, 'learner');

  const eligible = useMemo(
    () => source.filter((b) => tierMeetsRequirement(studentHighestTier, b.requiredTier)),
    [source, studentHighestTier]
  );
  const shown = filter === 'eligible' ? eligible : source;

  async function handleApply(bounty) {
    if (!onApply) return;
    setApplyingId(bounty.id);
    try {
      await onApply(bounty);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header — bold blue hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-grad-brand-deep p-6 text-white shadow-brand">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-white">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
                <Coins className="h-5 w-5" />
              </span>
              Your skill is your application.
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
              Real companies post paid tasks here. You apply with your
              verified skills — no CV, no cover letter, no "years of experience required."
              The payment is held safely up front, so you know you'll get paid.
              {academicStatus === 'in_school' && (
                <strong className="text-white"> You can start earning right now, from school.</strong>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tnum text-5xl font-black leading-none text-white">{eligible.length}</p>
            <p className="mt-1 text-xs text-white/70">tasks you qualify for</p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-white">
              {TIER_CONFIG[studentHighestTier]?.icon} {TIER_CONFIG[studentHighestTier]?.label} tier
            </p>
          </div>
        </div>

        {credScore < 450 && (
          <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs text-white/90 backdrop-blur">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>CredScore {credScore}. Verify more skills or finish your first task to unlock higher-paying work.</span>
          </div>
        )}
      </div>

      {/* View toggle: open tasks vs my applications */}
      <div className="flex items-center gap-2">
        {[
          ['open', 'Open tasks'],
          ['mine', `My tasks${applications.length ? ` (${applications.length})` : ''}`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setView(val)}
            className={`relative rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${view === val ? 'bg-brand-600 text-white' : 'border border-border-subtle bg-bg-elevated text-content-secondary hover:bg-bg-sunken'}`}>
            {label}
            {val === 'mine' && pendingInvites > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {pendingInvites}
              </span>
            )}
          </button>
        ))}
      </div>

      {view === 'open' ? (
        <>
          {/* Eligibility filter tabs */}
          <div className="flex items-center gap-2">
            {[
              ['all', `All tasks (${source.length})`],
              ['eligible', `I qualify (${eligible.length})`],
            ].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === val ? 'bg-brand-600 text-white' : 'border border-border-subtle bg-bg-elevated text-content-secondary hover:bg-bg-sunken'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Task list */}
          <motion.div variants={stagger(0.06)} initial="initial" animate="animate" className="space-y-3">
            {shown.map((b) => {
              const qualifies = tierMeetsRequirement(studentHighestTier, b.requiredTier);
              const reqTier = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
              const appStatus = b.myApplicationStatus;
              const applied = Boolean(appStatus) && appStatus !== 'rejected';
              return (
                <motion.article
                  key={b.id}
                  variants={staggerItem}
                  className={`rounded-2xl border bg-bg-elevated p-5 shadow-card transition-all hover:shadow-card-hover ${qualifies ? 'border-border-subtle' : 'border-border-subtle opacity-70'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">{b.companyLogo}</span>
                        <span className="text-xs font-bold text-brand-600">{b.company}</span>
                        {appStatus ? (
                          <Badge tone={APP_STATUS[appStatus]?.tone || 'neutral'} variant="soft" size="sm" icon={APP_STATUS[appStatus]?.icon}>
                            {APP_STATUS[appStatus]?.label || appStatus}
                          </Badge>
                        ) : qualifies ? (
                          <Badge tone="success" variant="soft" size="sm" icon={<CheckCircle2 />}>You qualify</Badge>
                        ) : (
                          <Badge tone="neutral" variant="soft" size="sm" icon={<Lock />}>Needs {reqTier.label}</Badge>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-sm font-bold text-content-primary">{b.title}</h4>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {b.skill}
                        {b.tests > 0 && ` · ${b.tests} automated tests`}
                        {b.tests === 0 && ' · Portfolio review'}
                        {b.deadline && ` · ${b.deadline} to complete`}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">{b.openTo}</p>

                      {/* Skill tags */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(b.skillTags || []).map((tag) => (
                          <span key={tag} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-muted">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-xl font-black text-content-primary">{b.reward}</p>
                      <p className="text-[10px] text-content-muted">+15 CredScore</p>
                    </div>
                  </div>

                  {/* Escrow notice */}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-content-muted">
                    <Hexagon className="h-3.5 w-3.5 text-brand-400" />
                    <span>Payment held safely up front, before you start</span>
                    {b.escrowConfirmed && (
                      <span className="font-medium text-accent-600 dark:text-accent-400">· Payment confirmed</span>
                    )}
                  </div>

                  {/* Credential awarded */}
                  {b.credentialAwarded && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-violet-600 dark:text-violet-400">
                      <Award className="h-3.5 w-3.5" />
                      <span>You'll earn a verified <strong>{b.credentialAwarded}</strong> skill when you finish</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-3">
                    {applied ? (
                      <Badge tone={APP_STATUS[appStatus]?.tone || 'neutral'} variant="soft" icon={APP_STATUS[appStatus]?.icon}>
                        {APP_STATUS[appStatus]?.label || appStatus}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={qualifies ? 'primary' : 'secondary'}
                        disabled={!qualifies || applyingId === b.id}
                        onClick={() => qualifies && handleApply(b)}
                        leftIcon={applyingId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
                        rightIcon={qualifies && applyingId !== b.id && <ArrowRight className="h-3.5 w-3.5" />}
                      >
                        {applyingId === b.id
                          ? 'Applying…'
                          : qualifies ? 'Apply with my verified skills' : `Need ${reqTier.label} tier`}
                      </Button>
                    )}
                    {!qualifies && !applied && (
                      <span className="flex items-center gap-1 text-[11px] text-brand-600">
                        Verify more skills to unlock <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </>
      ) : (
        /* ── My applications view ── */
        <MyApplications
          applications={applications}
          onDeliver={(app) => setDeliverFor(app)}
          onRespond={onRespond}
          onRate={(app) => setRateFor(app)}
        />
      )}

      {/* How it works */}
      <Card padding="lg" className="bg-bg-sunken">
        <p className="mb-4 text-xs font-bold text-content-secondary">How it works</p>
        <div className="grid grid-cols-2 gap-4 text-center text-[11px] sm:grid-cols-4">
          {[
            ['Apply', Target, 'Your verified skill is the application — no CV needed'],
            ['Held safely', Hexagon, 'The company puts the full payment aside before you start'],
            ['Deliver', Package, 'Send in your work. The company has 72 hours to confirm.'],
            ['Get paid', Coins, 'The money lands in your wallet. Your CredScore goes up.'],
          ].map(([step, Icon, desc], i) => (
            <div key={i}>
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-bold text-content-primary">{step}</p>
              <p className="mt-0.5 leading-tight text-content-muted">{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Global challenges + leaderboard */}
      <div className="border-t border-border-subtle pt-6">
        <GlobalChallenges isEmployer={false} />
      </div>

      {/* Delivery modal */}
      <DeliveryModal
        application={deliverFor}
        onClose={() => setDeliverFor(null)}
        onSubmit={onDeliver}
      />

      {/* Rate-employer modal */}
      <RateModal
        application={rateFor}
        onClose={() => setRateFor(null)}
        onSubmit={onRate}
      />
    </div>
  );
}

// ── My applications list ──────────────────────────────────────
function MyApplications({ applications, onDeliver, onRespond, onRate }) {
  const [busyId, setBusyId] = useState(null);

  if (!applications.length) {
    return (
      <EmptyState
        icon={Coins}
        title="You haven't applied to anything yet"
        description="Switch to Open tasks and apply with your verified skills — or wait for an employer to assign you a task directly."
      />
    );
  }

  async function respond(app, decision) {
    if (!onRespond) return;
    setBusyId(app.id);
    try {
      await onRespond(app.bounty?.id || app.bountyId, decision);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-3">
      {applications.map((a) => {
        const s = APP_STATUS[a.status] || { tone: 'neutral', label: a.status };
        const b = a.bounty || {};
        const isDirect = b.bountyType === 'direct';
        const alreadyRated = Boolean(a.rating?.studentToEmployer?.stars);
        const canRate = (a.status === 'confirmed' || a.status === 'won') && !alreadyRated;
        return (
          <motion.div key={a.id} variants={staggerItem}>
            <Card className={`p-4 ${a.status === 'invited' ? 'border-brand-300 ring-1 ring-brand-200' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{b.companyLogo}</span>
                    <span className="text-xs font-bold text-brand-600">{b.company}</span>
                    {isDirect && (
                      <Badge tone="brand" variant="soft" size="sm" icon={<Target />}>Direct offer</Badge>
                    )}
                    <Badge tone={s.tone} variant="soft" size="sm" icon={s.icon}>{s.label}</Badge>
                  </div>
                  <h4 className="mt-1.5 text-sm font-bold text-content-primary">{b.title}</h4>
                  {a.delivery?.text && (
                    <p className="mt-1 line-clamp-2 text-xs text-content-muted">Delivered: {a.delivery.text}</p>
                  )}
                  {alreadyRated && (
                    <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-amber-500">
                      <Star className="h-3 w-3 fill-current" /> You rated this employer {a.rating.studentToEmployer.stars}/5
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-lg font-black text-content-primary">{b.reward}</p>

                  {/* Direct invite → Accept / Decline */}
                  {a.status === 'invited' && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      <Button size="sm" onClick={() => respond(a, 'accept')} disabled={busyId === a.id}
                        leftIcon={busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}>
                        Accept task
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => respond(a, 'decline')} disabled={busyId === a.id}>
                        Decline
                      </Button>
                    </div>
                  )}

                  {a.status === 'accepted' && (
                    <Button size="sm" className="mt-2" onClick={() => onDeliver(a)} leftIcon={<Send className="h-3.5 w-3.5" />}>
                      Submit delivery
                    </Button>
                  )}

                  {canRate && (
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => onRate(a)} leftIcon={<Star className="h-3.5 w-3.5" />}>
                      Rate employer
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── Delivery submission modal ─────────────────────────────────
function DeliveryModal({ application, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [links, setLinks] = useState('');
  const [busy, setBusy] = useState(false);

  const open = Boolean(application);

  async function submit() {
    if (!text.trim() || !onSubmit) return;
    setBusy(true);
    try {
      await onSubmit(application, { text, links });
      setText('');
      setLinks('');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Submit your delivery"
      description={application?.bounty?.title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !text.trim()} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>
            {busy ? 'Submitting…' : 'Submit delivery'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Textarea
          label="Describe what you delivered"
          required
          rows={5}
          placeholder="Summarise your work, what you built, and how it meets the brief…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Input
          label="Links (comma-separated)"
          hint="GitHub repo, deployed demo, Figma file, Google Doc…"
          placeholder="https://github.com/you/project, https://demo.app"
          value={links}
          onChange={(e) => setLinks(e.target.value)}
        />
        <p className="text-[11px] text-content-muted">
          Once you submit, the employer has 72 hours to confirm. On confirmation the payment releases and
          you earn a verified credential.
        </p>
      </div>
    </Modal>
  );
}

// ── Star rating modal (reused for student→employer) ───────────
function RateModal({ application, onClose, onSubmit }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const open = Boolean(application);

  async function submit() {
    if (!onSubmit) return;
    setBusy(true);
    try {
      await onSubmit(application.bounty?.id || application.bountyId, application.id, { stars, comment });
      setStars(5);
      setComment('');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Rate this employer"
      description={application?.bounty?.title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}>
            {busy ? 'Submitting…' : 'Submit rating'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setStars(n)} className="p-1">
              <Star className={`h-7 w-7 ${n <= stars ? 'fill-amber-400 text-amber-400' : 'text-content-muted'}`} />
            </button>
          ))}
        </div>
        <Textarea
          label="Comment (optional)"
          rows={3}
          placeholder="How was the brief, communication, and payment?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="text-[11px] text-content-muted">
          Ratings build marketplace trust. They are deliberately kept out of your CredScore, which stays evidence-only.
        </p>
      </div>
    </Modal>
  );
}
