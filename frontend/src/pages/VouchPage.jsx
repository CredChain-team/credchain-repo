// ─────────────────────────────────────────────────────────────
// CredChain — Vouch page (/vouch/:studentId/:skillIndex)
// The target of a student's shareable "request a vouch" link. Any signed-in
// member can land here; if their reputation is ≥ 60 they can stake 10 points to
// attest the student's self-declared skill (promoting it sandbox → attested).
// Everyone else sees a clear explanation of why they can't vouch yet.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Handshake, ShieldCheck, SearchX, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import PublicLayout from '../portals/public/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { getStudentPortfolio, vouchSandboxSkill } from '../services/api';
import { Card, Button, Badge, EmptyState, AttestedBadge } from '../components/ui';
import { fadeUp } from '../theme/motion';

export default function VouchPage() {
  const { studentId, skillIndex } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [state, setState] = useState('loading'); // loading | ready | error | notfound
  const [student, setStudent] = useState(null);
  const [skill, setSkill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  const idx = Number(skillIndex);
  const isSelf = isAuthenticated && String(user?.id) === String(studentId);

  useEffect(() => {
    if (!isAuthenticated) {
      setState('ready');
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data = await getStudentPortfolio(studentId);
        if (!alive) return;
        const sandbox = data?.sandboxLedger || [];
        setStudent(data?.student || null);
        if (!Number.isInteger(idx) || idx < 0 || idx >= sandbox.length) {
          setState('notfound');
          return;
        }
        setSkill(sandbox[idx]);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated, studentId, idx]);

  async function handleVouch() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await vouchSandboxSkill(studentId, idx);
      setResult({ ok: true, message: res?.message || 'Vouch recorded.' });
    } catch (err) {
      setResult({ ok: false, message: err?.response?.data?.message || 'Could not record the vouch.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg">
        {/* Not signed in */}
        {!isAuthenticated && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <Card padding="lg" className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
                <Handshake className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold text-content-primary">Sign in to vouch</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-content-secondary">
                Someone asked you to vouch for a skill. You'll need to sign in first — vouching stakes your own reputation, so it can't be anonymous.
              </p>
              <Link to="/login" className="mt-5 inline-block">
                <Button leftIcon={<ShieldCheck className="h-4 w-4" />}>Sign in to continue</Button>
              </Link>
            </Card>
          </motion.div>
        )}

        {isAuthenticated && state === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            <span className="text-sm text-content-secondary">Loading the skill…</span>
          </div>
        )}

        {isAuthenticated && state === 'error' && (
          <Card padding="lg" className="text-center">
            <EmptyState icon={SearchX} title="Couldn't load this request" description="Please try the link again in a moment." />
          </Card>
        )}

        {isAuthenticated && state === 'notfound' && (
          <Card padding="lg" className="text-center">
            <EmptyState
              icon={SearchX}
              title="Skill not found"
              description="This vouch link is no longer valid — the skill may have already been vouched for or removed."
            />
          </Card>
        )}

        {isAuthenticated && state === 'ready' && skill && (
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <Card padding="lg">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
                  <Handshake className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-content-primary">
                    Vouch for {student?.name || 'this student'}
                  </h1>
                  <p className="mt-0.5 text-sm text-content-secondary">
                    You're about to put your reputation behind a self-declared skill.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border-subtle bg-bg-sunken p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-content-primary">{skill.skillName}</p>
                  <AttestedBadge />
                </div>
                <p className="mt-1 text-xs text-content-muted">
                  {skill.source}{skill.link ? ` · ${skill.link}` : ''}
                </p>
              </div>

              {/* Result banner */}
              {result && (
                <div
                  className={`mt-4 flex items-start gap-2 rounded-xl border p-3.5 text-sm ${
                    result.ok
                      ? 'border-accent-500/40 bg-accent-500/10 text-accent-600'
                      : 'border-danger-500/40 bg-danger-500/10 text-danger-500'
                  }`}
                >
                  {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{result.message}</span>
                </div>
              )}

              {/* Action / gating */}
              {!result?.ok && (
                <div className="mt-5">
                  {isSelf ? (
                    <p className="text-center text-sm text-content-secondary">
                      You can't vouch for your own skill — share this link with someone who knows your work.
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 rounded-lg bg-bg-sunken px-3 py-2 text-xs text-content-secondary">
                        Vouching stakes <span className="font-semibold text-content-primary">10 reputation points</span>. You keep them if the vouch holds up — you lose them for good if it's ever proven false. You need a reputation of <span className="font-semibold">60+</span> to vouch.
                      </div>
                      <Button fullWidth loading={submitting} onClick={handleVouch} leftIcon={<Handshake className="h-4 w-4" />}>
                        Vouch &amp; stake 10 points
                      </Button>
                    </>
                  )}
                </div>
              )}

              {result?.ok && (
                <div className="mt-5 text-center">
                  <Button variant="secondary" onClick={() => navigate('/')}>Done</Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </PublicLayout>
  );
}
