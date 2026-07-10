/**
 * CredChain — Assign Task modal (Employer → specific student)
 *
 * Opened from a Talent Search / Talent Feed card. The employer hand-picks ONE
 * student and assigns them a paid "live task" directly — no open call. Posts to
 * /api/v1/bounties/direct, which holds escrow up front and drops an invite into
 * the student's Earn tab. On accept it runs the same deliver → confirm → mint
 * pipeline as any bounty, so the awarded credential is corroboration-weighted.
 */
import { useState } from 'react';
import { Loader2, Target } from 'lucide-react';
import { SKILL_CATEGORIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER } from '../../lib/credScore';
import { createDirectTask } from '../../services/api';
import { Button, Modal, Input, Textarea, Select, useToast } from '../ui';

const BLANK = {
  title: '', description: '', skill: '', skillName: '', skillCategory: 'Backend',
  skillTags: '', reward: '', rewardUSD: '', rewardSOL: '', tests: '', requiredTier: 'learner',
  deadline: '',
};

export default function AssignTaskModal({ student, onClose, onAssigned }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const open = Boolean(student);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    setBusy(true);
    try {
      await createDirectTask({
        studentId: student.id,
        ...form,
        rewardUSD: Number(form.rewardUSD) || 0,
        rewardSOL: Number(form.rewardSOL) || 0,
        tests: Number(form.tests) || 0,
      });
      toast.success(`Task sent to ${student.name}`, {
        description: 'Payment is held in escrow until they deliver. They can accept or decline.',
      });
      setForm(BLANK);
      onAssigned?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not assign the task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={student ? `Assign a task to ${student.name}` : 'Assign a task'}
      description="A direct, paid offer to this one student. Payment is held in escrow up front — they accept, deliver, and earn a verified credential."
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}>
            {busy ? 'Assigning…' : 'Assign & hold escrow'}
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
          <Select label="Credential tier (if delivered)" value={form.requiredTier} onChange={set('requiredTier')}>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_CONFIG[t]?.label}</option>)}
          </Select>
        </div>
        <Input label="Skill tags (comma-separated)" placeholder="Node.js, Webhooks, REST APIs" value={form.skillTags} onChange={set('skillTags')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Reward (display)" placeholder="₦250,000 or $600" value={form.reward} onChange={set('reward')} />
          <Input label="Reward USD" type="number" placeholder="155" value={form.rewardUSD} onChange={set('rewardUSD')} />
          <Input label="Escrow (SOL)" type="number" placeholder="1.5" value={form.rewardSOL} onChange={set('rewardSOL')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Automated tests" type="number" placeholder="0 = portfolio review" value={form.tests} onChange={set('tests')} />
          <Input label="Deadline" placeholder="7 days" value={form.deadline} onChange={set('deadline')} />
        </div>
        <p className="rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2 text-[11px] text-content-muted">
          The credential this earns is weighted by real corroboration — deliveries and independent issuers — so it can't be
          gamed. A great direct delivery is proof of work, not just a signature.
        </p>
      </div>
    </Modal>
  );
}
