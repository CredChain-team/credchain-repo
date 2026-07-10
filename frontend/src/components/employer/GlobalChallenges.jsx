/**
 * CredChain — Global Challenges (open competition + leaderboard)
 *
 * The anti-self-dealing showcase. An open bounty anyone eligible can SUBMIT to;
 * the sponsor judges the whole field and picks winners. A winner's credential
 * is weighted by how many REAL submissions they beat (utils/bountyWeight.js) —
 * so a self-dealt "win" with no crowd mints near-worthless proof, while a
 * genuinely contested win mints strong proof.
 *
 * One component, both roles:
 *   • student  → submit to open challenges, see the leaderboard
 *   • employer → post a challenge (prize pool), judge submissions, pick winners
 */
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Plus, Loader2, Send, Crown, Users, Medal, Coins, ArrowRight, Award,
} from 'lucide-react';
import { TIER_CONFIG, TIER_ORDER, scoreBand } from '../../lib/credScore';
import {
  listGlobalBounties, createGlobalBounty, submitToGlobalBounty,
  getGlobalSubmissions, selectWinners, getLeaderboard,
} from '../../services/api';
import { SKILL_CATEGORIES } from '../../mock/data';
import { Card, Badge, Button, Modal, Input, Textarea, Select, EmptyState, useToast } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

const STATUS_TONE = { open: 'success', completed: 'neutral', cancelled: 'neutral' };

export default function GlobalChallenges({ isEmployer = false }) {
  const toast = useToast();
  const [bounties, setBounties] = useState([]);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [submitFor, setSubmitFor] = useState(null);
  const [judgeFor, setJudgeFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, lRes] = await Promise.allSettled([listGlobalBounties(), getLeaderboard()]);
      if (gRes.status === 'fulfilled') setBounties(gRes.value?.bounties || []);
      if (lRes.status === 'fulfilled') setBoard(lRes.value?.leaderboard || []);
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePost(payload) {
    await createGlobalBounty(payload);
    toast.success('Challenge posted', { description: 'The full prize pool is held in escrow up front.' });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-content-primary">
            <Trophy className="h-4 w-4 text-amber-500" /> Global challenges
          </h3>
          <p className="mt-1 max-w-lg text-xs leading-relaxed text-content-secondary">
            Open competitions anyone can enter. Winners earn a credential weighted by the real field they beat —
            <strong className="text-content-primary"> proof of work you can't buy or self-deal.</strong>
          </p>
        </div>
        {isEmployer && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="shrink-0" onClick={() => setShowPost(true)}>
            Post a challenge
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Challenges list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <span className="text-sm text-content-secondary">Loading challenges…</span>
            </div>
          ) : bounties.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No global challenges yet"
              description={isEmployer ? 'Post an open challenge with a prize pool to source a whole field of talent at once.' : 'Check back soon — open competitions appear here.'}
            />
          ) : (
            <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-3">
              {bounties.map((b) => (
                <motion.div key={b.id} variants={staggerItem}>
                  <ChallengeCard
                    b={b}
                    isEmployer={isEmployer}
                    onSubmit={() => setSubmitFor(b)}
                    onJudge={() => setJudgeFor(b)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Leaderboard */}
        <Leaderboard board={board} loading={loading} />
      </div>

      <PostChallengeModal open={showPost} onClose={() => setShowPost(false)} onCreate={handlePost} />
      <SubmitModal bounty={submitFor} onClose={() => setSubmitFor(null)} onDone={load} />
      <JudgeModal bounty={judgeFor} onClose={() => setJudgeFor(null)} onDone={load} />
    </div>
  );
}

function ChallengeCard({ b, isEmployer, onSubmit, onJudge }) {
  const reqTier = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
  const mine = b.mySubmissionStatus;
  return (
    <Card interactive className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">{b.companyLogo}</span>
            <span className="text-xs font-bold text-brand-600">{b.company}</span>
            <Badge tone={STATUS_TONE[b.status] || 'neutral'} variant="soft" size="sm">
              {b.status === 'open' ? 'Open' : b.status === 'completed' ? 'Winners announced' : b.status}
            </Badge>
            <Badge tone="neutral" variant="soft" size="sm">{reqTier.icon} {reqTier.label}+</Badge>
            {b.sponsorVerified && <Badge tone="success" variant="soft" size="sm">Vetted sponsor</Badge>}
          </div>
          <h4 className="mt-1.5 text-sm font-bold text-content-primary">{b.title}</h4>
          <p className="mt-0.5 line-clamp-2 text-xs text-content-secondary">{b.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-content-muted">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {b.submissionCount || 0} submitted</span>
            {b.deadline && <span>{b.deadline}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-black text-content-primary">{b.reward}</p>
          <p className="text-[10px] uppercase tracking-wide text-content-muted">prize pool</p>
        </div>
      </div>

      {(b.prizes || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {b.prizes.map((p) => (
            <span key={p.rank} className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-secondary">
              <Medal className="h-3 w-3 text-amber-500" /> {p.label}: {p.reward}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {isEmployer ? (
          <Button size="sm" variant={b.status === 'open' ? 'primary' : 'secondary'} onClick={onJudge} rightIcon={<ArrowRight className="h-4 w-4" />}>
            {b.status === 'completed' ? 'View results' : 'Review & judge'}
          </Button>
        ) : mine ? (
          <Badge tone={b.myIsWinner ? 'success' : 'violet'} variant="soft" icon={b.myIsWinner ? <Crown /> : <Send />}>
            {b.myIsWinner ? `You won — ${b.myPlacement === 1 ? '1st' : b.myPlacement === 2 ? '2nd' : `${b.myPlacement}th`} place` : `Submitted (${mine})`}
          </Badge>
        ) : b.status === 'open' ? (
          <Button size="sm" onClick={onSubmit} leftIcon={<Send className="h-4 w-4" />}>Submit your entry</Button>
        ) : (
          <Badge tone="neutral" variant="soft">Closed</Badge>
        )}
      </div>
    </Card>
  );
}

function Leaderboard({ board, loading }) {
  return (
    <Card className="h-fit p-5">
      <h4 className="flex items-center gap-2 text-sm font-bold text-content-primary">
        <Crown className="h-4 w-4 text-amber-500" /> Leaderboard
      </h4>
      <p className="mt-1 text-[11px] text-content-muted">Top earners by real delivered work — the thing that can't be bought.</p>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
      ) : board.length === 0 ? (
        <p className="py-6 text-center text-xs text-content-muted">No ranked earners yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {board.map((r) => {
            const band = scoreBand(r.credScore);
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`;
            return (
              <div key={r.credchainId || r.rank} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2">
                <span className="w-6 shrink-0 text-center text-sm font-bold">{medal}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-content-primary">{r.name}</p>
                  <p className="text-[10px] text-content-muted">{r.deliveries} deliveries · ◎ {r.earnedSOL} SOL</p>
                </div>
                <span className="tnum shrink-0 rounded-md px-1.5 py-0.5 text-xs font-black" style={{ color: band.color, background: `${band.color}1f` }}>
                  {r.credScore}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Post challenge modal (employer) ───────────────────────────
const BLANK = {
  title: '', description: '', skill: '', skillName: '', skillCategory: 'Backend', skillTags: '',
  requiredTier: 'learner', deadline: '',
  p1USD: '', p1SOL: '', p2USD: '', p2SOL: '', p3USD: '', p3SOL: '',
};

function PostChallengeModal({ open, onClose, onCreate }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    const prizes = [];
    if (Number(form.p1SOL) || Number(form.p1USD)) prizes.push({ rank: 1, label: '1st place', amountSOL: Number(form.p1SOL) || 0, amountUSD: Number(form.p1USD) || 0, reward: form.p1USD ? `$${form.p1USD}` : `${form.p1SOL} SOL` });
    if (Number(form.p2SOL) || Number(form.p2USD)) prizes.push({ rank: 2, label: '2nd place', amountSOL: Number(form.p2SOL) || 0, amountUSD: Number(form.p2USD) || 0, reward: form.p2USD ? `$${form.p2USD}` : `${form.p2SOL} SOL` });
    if (Number(form.p3SOL) || Number(form.p3USD)) prizes.push({ rank: 3, label: '3rd place', amountSOL: Number(form.p3SOL) || 0, amountUSD: Number(form.p3USD) || 0, reward: form.p3USD ? `$${form.p3USD}` : `${form.p3SOL} SOL` });
    if (prizes.length === 0) {
      toast.error('Add at least one prize.');
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        title: form.title, description: form.description, skill: form.skill, skillName: form.skillName,
        skillCategory: form.skillCategory, skillTags: form.skillTags, requiredTier: form.requiredTier,
        deadline: form.deadline, prizes,
      });
      setForm(BLANK);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post the challenge.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Post a global challenge"
      description="The whole prize pool is held in escrow up front — you can't list a challenge you can't pay for."
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}>
            {busy ? 'Posting…' : 'Post & fund pool'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Title" required placeholder="e.g. Best Solana payments demo" value={form.title} onChange={set('title')} />
        <Textarea label="Description" required rows={4} placeholder="The brief, judging criteria, what a great entry looks like…" value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Skill name" placeholder="Solana Payments" value={form.skillName} onChange={set('skillName')} />
          <Select label="Skill category" value={form.skillCategory} onChange={set('skillCategory')}>
            {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Minimum tier to enter" value={form.requiredTier} onChange={set('requiredTier')}>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_CONFIG[t]?.label}</option>)}
          </Select>
          <Input label="Deadline" placeholder="14 days" value={form.deadline} onChange={set('deadline')} />
        </div>
        <Input label="Skill tags (comma-separated)" placeholder="Solana, Web3, Payments" value={form.skillTags} onChange={set('skillTags')} />
        <div>
          <p className="mb-2 text-xs font-semibold text-content-secondary">Prize pool (at least 1st place)</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border-subtle p-2">
              <p className="mb-1 text-[11px] font-bold text-amber-500">🥇 1st</p>
              <Input label="USD" type="number" placeholder="900" value={form.p1USD} onChange={set('p1USD')} />
              <Input label="SOL" type="number" placeholder="6" value={form.p1SOL} onChange={set('p1SOL')} className="mt-2" />
            </div>
            <div className="rounded-lg border border-border-subtle p-2">
              <p className="mb-1 text-[11px] font-bold text-content-muted">🥈 2nd</p>
              <Input label="USD" type="number" placeholder="450" value={form.p2USD} onChange={set('p2USD')} />
              <Input label="SOL" type="number" placeholder="3" value={form.p2SOL} onChange={set('p2SOL')} className="mt-2" />
            </div>
            <div className="rounded-lg border border-border-subtle p-2">
              <p className="mb-1 text-[11px] font-bold text-amber-700">🥉 3rd</p>
              <Input label="USD" type="number" placeholder="225" value={form.p3USD} onChange={set('p3USD')} />
              <Input label="SOL" type="number" placeholder="1.5" value={form.p3SOL} onChange={set('p3SOL')} className="mt-2" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Submit entry modal (student) ──────────────────────────────
function SubmitModal({ bounty, onClose, onDone }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [links, setLinks] = useState('');
  const [busy, setBusy] = useState(false);
  const open = Boolean(bounty);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await submitToGlobalBounty(bounty.id, { text, links });
      toast.success('Entry submitted', { description: 'You are now in the running. Good luck!' });
      setText(''); setLinks('');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not submit your entry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Submit your entry"
      description={bounty?.title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !text.trim()} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>
            {busy ? 'Submitting…' : 'Submit entry'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Textarea label="Describe your entry" required rows={5} placeholder="What you built, how it meets the brief, and why it should win…" value={text} onChange={(e) => setText(e.target.value)} />
        <Input label="Links (comma-separated)" placeholder="https://github.com/you/project, https://demo.app" value={links} onChange={(e) => setLinks(e.target.value)} />
      </div>
    </Modal>
  );
}

// ── Judge / select-winners modal (employer) ───────────────────
function JudgeModal({ bounty, onClose, onDone }) {
  const toast = useToast();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ranks, setRanks] = useState({}); // appId → rank
  const [live, setLive] = useState(bounty);
  const open = Boolean(bounty);

  const load = useCallback(async () => {
    if (!bounty) return;
    setLoading(true);
    try {
      const data = await getGlobalSubmissions(bounty.id);
      setSubs(data?.submissions || []);
      if (data?.bounty) setLive(data.bounty);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load submissions.');
    } finally {
      setLoading(false);
    }
  }, [bounty, toast]);

  useEffect(() => { setLive(bounty); setRanks({}); if (bounty) load(); }, [bounty, load]);

  const done = live?.status === 'completed';

  function setRank(appId, rank) {
    setRanks((r) => ({ ...r, [appId]: rank ? Number(rank) : undefined }));
  }

  async function submit() {
    const winners = Object.entries(ranks)
      .filter(([, rank]) => rank)
      .map(([appId, rank]) => ({ appId, rank }));
    if (winners.length === 0) {
      toast.error('Assign a rank to at least one submission.');
      return;
    }
    setBusy(true);
    try {
      const res = await selectWinners(bounty.id, winners);
      toast.success('Winners selected', {
        description: `${res?.winners?.length || winners.length} credential(s) minted, weighted by the real field they beat.`,
      });
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not select winners.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={live?.title}
      description={`${live?.submissionCount || subs.length} submissions · ${live?.reward || ''}`}
      size="xl"
      footer={done ? null : (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}>
            {busy ? 'Awarding…' : 'Award winners & mint'}
          </Button>
        </div>
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-content-secondary">Loading submissions…</span>
        </div>
      ) : subs.length === 0 ? (
        <EmptyState icon={Users} title="No submissions yet" description="Entrants will appear here as they submit." />
      ) : (
        <div className="space-y-3">
          {!done && (
            <p className="rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-[11px] text-content-muted">
              A win from a big real field mints a strong credential; a shallow or self-dealt field mints near-worthless proof.
              You beat a crowd of <strong>{live?.submissionCount || subs.length}</strong> here.
            </p>
          )}
          {subs.map((a) => (
            <div key={a.id} className="rounded-xl border border-border-subtle bg-bg-elevated p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-content-primary">{a.studentName}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand-600"><Coins className="h-3 w-3" /> CredScore {a.credScore}</span>
                    {a.isWinner && <Badge tone="success" variant="soft" size="sm" icon={<Crown />}>{a.placement === 1 ? '1st' : a.placement === 2 ? '2nd' : `${a.placement}th`} place</Badge>}
                  </div>
                  {a.delivery?.text && <p className="mt-1 text-xs text-content-primary">{a.delivery.text}</p>}
                  {(a.delivery?.links || []).map((l) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-brand-600 hover:underline">{l}</a>
                  ))}
                </div>
                {!done && (
                  <div className="shrink-0">
                    <Select value={ranks[a.id] || ''} onChange={(e) => setRank(a.id, e.target.value)} className="h-9 w-28 text-xs">
                      <option value="">Not placed</option>
                      <option value="1">🥇 1st</option>
                      <option value="2">🥈 2nd</option>
                      <option value="3">🥉 3rd</option>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
