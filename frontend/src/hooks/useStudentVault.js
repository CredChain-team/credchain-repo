// ─────────────────────────────────────────────────────────────
// CredChain — Student Vault data hook
// One place to load + mutate the student's credential state. Combines the
// legacy /api/student/:id (ALL credentials, every status → powers the
// pending queue + audit trail) with /api/v1/.../portfolio (sandbox ledger +
// cached AI telemetry).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  getStudent,
  getStudentPortfolio,
  acceptCredential,
  rejectCredential,
  addSandboxSkill,
  disputeAttestation,
} from '../services/api';

export function useStudentVault(userId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [sandbox, setSandbox] = useState([]);
  const [attested, setAttested] = useState([]);
  const [telemetry, setTelemetry] = useState(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setError('no-user');
      setLoading(false);
      return;
    }
    try {
      const [studentRes, portfolioRes] = await Promise.allSettled([
        getStudent(userId),
        getStudentPortfolio(userId),
      ]);

      if (studentRes.status === 'fulfilled') {
        setCredentials(studentRes.value?.student?.credentials || []);
      }
      if (portfolioRes.status === 'fulfilled') {
        setSandbox(portfolioRes.value?.sandboxLedger || []);
        setAttested(portfolioRes.value?.attestedLedger || []);
        setTelemetry(portfolioRes.value?.aiTelemetry || null);
      }
      if (studentRes.status === 'rejected' && portfolioRes.status === 'rejected') {
        setError('load-failed');
      } else {
        setError(null);
      }
    } catch {
      setError('load-failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const accept = useCallback(async (id) => {
    const res = await acceptCredential(id);
    await refresh();
    return res;
  }, [refresh]);

  const reject = useCallback(async (id) => {
    const res = await rejectCredential(id);
    await refresh();
    return res;
  }, [refresh]);

  const addSandbox = useCallback(async (payload) => {
    const res = await addSandboxSkill(payload);
    await refresh();
    return res;
  }, [refresh]);

  const disputeAttested = useCallback(async (attestedIndex, reason) => {
    const res = await disputeAttestation(userId, attestedIndex, reason);
    await refresh();
    return res;
  }, [refresh, userId]);

  const pending = credentials.filter((c) => c.status === 'pending');
  const verified = credentials.filter((c) => c.status === 'accepted');
  const revoked = credentials.filter((c) => c.status === 'revoked');

  return {
    loading,
    error,
    credentials,
    pending,
    verified,
    revoked,
    sandbox,
    attested,
    telemetry,
    setTelemetry,
    refresh,
    accept,
    reject,
    addSandbox,
    disputeAttested,
  };
}
