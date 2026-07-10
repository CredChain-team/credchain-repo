/**
 * CredChain — Micro-Bounties (Employer)
 *
 * Employers post skill challenges with escrowed payment, review applicants
 * (each with a verified CredScore), accept one, then confirm the delivery —
 * which releases payment and awards the student a verified credential.
 *
 * Wired to the real /api/v1/bounties lifecycle. Falls back to the mock list
 * only if the employer has posted nothing yet.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Hexagon, ArrowRight, Trophy, Loader2, CheckCircle2, Users, Coins, Package, Award, Star,
} from 'lucide-react';
import { MICRO_BOUNTIES, SKILL_CATEGORIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER } from '../../lib/credScore';
import {
  getMyBounties, createBounty, getBountyApplicants, acceptApplicant, confirmDelivery, rateCounterparty,
} from '../../services/api';
import { Card, Badge, Button, Modal, Input, Textarea, Select, EmptyState, useToast } from '../ui';
import GlobalChallenges from './GlobalChallenges';
import { stagger, staggerItem } from '../../theme/motion';

const STATUS_TONE = {
  open: 'success',
  in_progress: 'warning',
  delivered: 'violet',
  completed: 'neutral',
  cancelled: 'neutral',
  reviewing: 'warning',
  closed: 'neutral',
};

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  delivered: 'Delivered — confirm to pay',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MicroBounties({ isEmployer = false }) {
  const toast = useToast();
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(isEmployer);
  const [showPost, setShowPost] = useState(false);
  const [applicantsFor, setApplicantsFor] = useState(null);
  const [section, setSection] = useState('bounties'); // bounties | global

  const load = useCallback(async () => {
    if (!isEmployer) { setBounties(MICRO_BOUNTIES); return; }
    try {
      const data = await getMyBounties();
      setBounties(data?.bounties || []);
    } catch {
      setBounties([]); // real empty state, not mock — employer manages their own
    } finally {
      setLoading(false);
    }
  }, [isEmployer]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(payload) {
    const res = await createBounty(payload);
    toast.success('Bounty posted', { description: 'Payment is held in escrow up front.' });
    if (res?.bounty) setBounties((prev) => [res.bounty, ...prev]);
    else load();
  }

  const hasBounties = bounties.length > 0;

  return (
    <div className="space-y-4">
      {/* Section toggle: direct bounties vs global challenges */}
      <div className="flex items-center gap-2">
        {[['bounties', '💰 Bounties'], ['global', '🏆 Global challenges']].map(([val, label]) => (
          <button key={val} onClick={() => setSection(val)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${section === val ? 'bg-brand-600 text-white' : 'border border-border-subtle bg-bg-elevated text-content-secondary hover:bg-bg-sunken'}`}>
            {label}
          </button>
        ))}
      </div>

      {section === 'global' ? (
        <GlobalChallenges isEmployer={isEmployer} />
      ) : (
      <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-content-primary">Micro-Bounties</h3>
          <p className="mt-1 max-w-lg text-xs leading-relaxed text-content-secondary">
            Post a skill challenge with escrowed payment. Verified students — including those currently in school —
            earn confirmed credentials for passing. You discover pre-tested talent before anyone else.
          </p>
        </div>
        {isEmployer && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="shrink-0" onClick={() => setShowPost(true)}>
            Post a bounty
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-content-secondary">Loading your bounties…</span>
        </div>
      ) : !hasBounties && isEmployer ? (
        <EmptyState
          icon={Trophy}
          title="No bounties yet"
          description="Post your first skill challenge to find and test talent before anyone else does."
          action={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowPost(true)}>Post a bounty</Button>}
        />
      ) : (
        <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-4">
          {bounties.map((b) => {
            const reqTier = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
            return (
              <motion.div key={b.id} variants={staggerItem}>
                <Card interactive className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">{b.companyLogo}</span>
                        <span className="text-xs font-bold text-brand-600">{b.company}</span>
                        <Badge tone={STATUS_TONE[b.status] || 'success'} variant="soft" size="sm">
                          {STATUS_LABEL[b.status] || b.status}
                        </Badge>
                        <Badge tone="neutral" variant="soft" size="sm">
                          {reqTier.icon} {reqTier.label}+
                        </Badge>
                        {b.escrowConfirmed && (
                          <Badge tone="brand" variant="soft" size="sm" icon={<Hexagon />}>Escrow held</Badge>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-sm font-bold text-content-primary">{b.title}</h4>
                      <p className="mt-0.5 text-xs text-content-secondary">
                        {b.skill}
                        {b.tests > 0 ? ` · ${b.tests} automated tests` : ' · Portfolio review'}
                        {b.deadline ? ` · ${b.deadline}` : ''}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-accent-600">{b.openTo}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black text-content-primary">{b.reward}</p>
                      <p className="text-[10px] uppercase tracking-wide text-content-muted">reward</p>
                    </div>
                  </div>

                  {(b.skillTags || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {b.skillTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-secondary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-content-muted">
                    <Hexagon className="h-3 w-3 text-brand-500" />
                    <span>Finish it and they earn a verified skill — tamper-proof and theirs to keep</span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {isEmployer ? (
                      <Button
                        variant={b.status === 'delivered' ? 'primary' : 'secondary'}
                        size="sm"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                        onClick={() => setApplicantsFor(b)}
                      >
                        {b.status === 'delivered' ? 'Review delivery' : 'View applicants'}
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                        View challenge
                      </Button>
                    )}
                    {isEmployer && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-content-muted">
                        <Users className="h-3.5 w-3.5" /> {b.applicantCount || 0} applicant{(b.applicantCount || 0) === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {(!isEmployer || !hasBounties) && (
        <Card className="border-dashed bg-bg-sunken p-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-600">
            <Trophy className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-content-primary">Find talent before graduation day.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-content-secondary">
            Students build their verified record while still in school. Post a bounty and get first access — before they
            interview anywhere else.
          </p>
          {isEmployer && (
            <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} className="mt-3" onClick={() => setShowPost(true)}>
              Post your first bounty
            </Button>
          )}
        </Card>
      )}

      <PostBountyModal open={showPost} onClose={() => setShowPost(false)} onCreate={handleCreate} />
      <ApplicantsModal
        bounty={applicantsFor}
        onClose={() => setApplicantsFor(null)}
        onChanged={load}
      />
      </div>
      )}
    </div>
  );
}

// ── Post Bounty modal ─────────────────────────────────────────
const BLANK = {
  title: '', description: '', skill: '', skillName: '', skillCategory: 'Backend',
  skillTags: '', reward: '', rewardUSD: '', rewardSOL: '', tests: '', requiredTier: 'learner',
  deadline: '', openTo: '',
};

function PostBountyModal({ open, onClose, onCreate }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        ...form,
        rewardUSD: Number(form.rewardUSD) || 0,
        rewardSOL: Number(form.rewardSOL) || 0,
        tests: Number(form.tests) || 0,
      });
      setForm(BLANK);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post the bounty.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Post a bounty"
      description="Payment is held in escrow up front, so students know they'll get paid."
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}>
            {busy ? 'Posting…' : 'Post bounty'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Title" required placeholder="e.g. Build a rate-limited payments webhook handler" value={form.title} onChange={set('title')} />
        <Textarea label="Description" required rows={4} placeholder="What needs building, acceptance criteria, tests to pass…" value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Skill (display)" placeholder="Backend / Node.js" value={form.skill} onChange={set('skill')} />
          <Input label="Skill name (awarded on the credential)" placeholder="Paystack Integration" value={form.skillName} onChange={set('skillName')} />
          <Select label="Skill category" value={form.skillCategory} onChange={set('skillCategory')}>
            {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Required tier" value={form.requiredTier} onChange={set('requiredTier')}>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_CONFIG[t]?.label}</option>)}
          </Select>
        </div>
        <Input label="Skill tags (comma-separated)" placeholder="Node.js, Webhooks, REST APIs" value={form.skillTags} onChange={set('skillTags')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Reward (display)" placeholder="₦250,000 or $600" value={form.reward} onChange={set('reward')} />
          <Input label="Reward USD" type="number" placeholder="155" value={form.rewardUSD} onChange={set('rewardUSD')} />
          <Input label="Escrow (SOL)" type="number" placeholder="1.5" value={form.rewardSOL} onChange={set('rewardSOL')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Automated tests" type="number" placeholder="0 = portfolio review" value={form.tests} onChange={set('tests')} />
          <Input label="Deadline" placeholder="7 days" value={form.deadline} onChange={set('deadline')} />
          <Input label="Open to" placeholder="Students welcome — any year" value={form.openTo} onChange={set('openTo')} />
        </div>
      </div>
    </Modal>
  );
}

// ── Applicants + Confirm modal ────────────────────────────────
function ApplicantsModal({ bounty, onClose, onChanged }) {
  const toast = useToast();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [live, setLive] = useState(bounty);

  const open = Boolean(bounty);

  const load = useCallback(async () => {
    if (!bounty) return;
    setLoading(true);
    try {
      const data = await getBountyApplicants(bounty.id);
      setApplicants(data?.applications || []);
      if (data?.bounty) setLive(data.bounty);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load applicants.');
    } finally {
      setLoading(false);
    }
  }, [bounty, toast]);

  useEffect(() => { setLive(bounty); if (bounty) load(); }, [bounty, load]);

  async function accept(app) {
    setBusyId(app.id);
    try {
      await acceptApplicant(bounty.id, app.id);
      toast.success(`${app.studentName} accepted`, { description: 'They can now deliver their work.' });
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not accept applicant.');
    } finally {
      setBusyId(null);
    }
  }

  async function confirm(app) {
    setBusyId(app.id);
    try {
      const res = await confirmDelivery(bounty.id, app.id);
      toast.success('Payment released', {
        description: res?.newCredScore
          ? `Credential awarded. ${app.studentName}'s CredScore is now ${res.newCredScore}.`
          : 'Credential awarded to the student.',
      });
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not confirm delivery.');
    } finally {
      setBusyId(null);
    }
  }

  async function rate(app, stars) {
    setBusyId(app.id);
    try {
      await rateCounterparty(bounty.id, app.id, { stars });
      toast.success(`Rated ${app.studentName} ${stars}/5`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not submit rating.');
    } finally {
      setBusyId(null);
    }
  }

  const status = live?.status;

  return (
    <Modal open={open} onClose={onClose} title={live?.title} description={`${live?.company || ''} · ${live?.reward || ''}`} size="xl">
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-content-secondary">Loading applicants…</span>
        </div>
      ) : applicants.length === 0 ? (
        <EmptyState icon={Users} title="No applicants yet" description="Students who apply with their verified skills will appear here." />
      ) : (
        <div className="space-y-3">
          {applicants.map((a) => {
            const tierConf = TIER_CONFIG[a.highestTier] || TIER_CONFIG.learner;
            const canAccept = status === 'open' && a.status === 'applied';
            const canConfirm = status === 'delivered' && a.status === 'delivered';
            return (
              <div key={a.id} className="rounded-xl border border-border-subtle bg-bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
                      {(a.studentName || 'S').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-content-primary">{a.studentName}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-elevated px-2 py-0.5 text-[11px] font-semibold text-content-secondary">
                          {tierConf.icon} {tierConf.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
                          <Coins className="h-3 w-3" /> CredScore {a.credScore}
                        </span>
                        {a.status !== 'applied' && (
                          <Badge tone={STATUS_TONE[status] || 'neutral'} variant="soft" size="sm">{a.status}</Badge>
                        )}
                      </div>
                      {a.message && <p className="mt-1 text-xs text-content-muted">{a.message}</p>}
                      {a.delivery && (
                        <div className="mt-2 rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-content-secondary">
                            <Package className="h-3.5 w-3.5" /> Delivery submitted
                          </p>
                          <p className="mt-1 text-xs text-content-primary">{a.delivery.text}</p>
                          {(a.delivery.links || []).map((l) => (
                            <a key={l} href={l} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-brand-600 hover:underline">{l}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {canAccept && (
                      <Button size="sm" onClick={() => accept(a)} disabled={busyId === a.id}
                        leftIcon={busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}>
                        {busyId === a.id ? 'Accepting…' : 'Accept'}
                      </Button>
                    )}
                    {canConfirm && (
                      <Button size="sm" onClick={() => confirm(a)} disabled={busyId === a.id}
                        leftIcon={busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}>
                        {busyId === a.id ? 'Confirming…' : 'Confirm & release payment'}
                      </Button>
                    )}
                    {a.status === 'accepted' && status !== 'delivered' && (
                      <Badge tone="brand" variant="soft" size="sm" icon={<CheckCircle2 />}>Accepted</Badge>
                    )}
                    {a.status === 'confirmed' && (
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge tone="success" variant="soft" size="sm" icon={<Award />}>Paid</Badge>
                        {a.rating?.employerToStudent?.stars ? (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500">
                            <Star className="h-3 w-3 fill-current" /> You rated {a.rating.employerToStudent.stars}/5
                          </span>
                        ) : (
                          <div className="flex items-center gap-0.5" title="Rate this student">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" onClick={() => rate(a, n)} disabled={busyId === a.id} className="p-0.5">
                                <Star className="h-3.5 w-3.5 text-content-muted hover:fill-amber-400 hover:text-amber-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
