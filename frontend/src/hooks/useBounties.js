// ─────────────────────────────────────────────────────────────
// CredChain — Student bounty data hook
// Loads open bounties (each carrying this student's application status) plus
// the student's own applications (for the "My applications" / delivery view),
// and exposes apply + submit-delivery mutations. Mirrors useStudentVault.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  listOpenBounties, getMyApplications, applyToBounty, submitDelivery,
  respondToDirectTask, rateCounterparty,
} from '../services/api';

export function useBounties(enabled = true) {
  const [loading, setLoading] = useState(true);
  const [bounties, setBounties] = useState([]);
  const [applications, setApplications] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [bRes, aRes] = await Promise.allSettled([listOpenBounties(), getMyApplications()]);
      if (bRes.status === 'fulfilled') setBounties(bRes.value?.bounties || []);
      if (aRes.status === 'fulfilled') setApplications(aRes.value?.applications || []);
    } catch {
      /* keep prior state — the Earn tab falls back to mock bounties */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    refresh();
  }, [enabled, refresh]);

  const apply = useCallback(async (bountyId, message) => {
    const res = await applyToBounty(bountyId, message ? { message } : {});
    await refresh();
    return res;
  }, [refresh]);

  const deliver = useCallback(async (bountyId, appId, payload) => {
    const res = await submitDelivery(bountyId, appId, payload);
    await refresh();
    return res;
  }, [refresh]);

  // Direct "live task" invites: the student accepts or declines an offer an
  // employer assigned to them specifically.
  const respondToInvite = useCallback(async (bountyId, decision) => {
    const res = await respondToDirectTask(bountyId, decision);
    await refresh();
    return res;
  }, [refresh]);

  // Two-way rating: the student rates the employer after a confirmed task.
  const rate = useCallback(async (bountyId, appId, payload) => {
    const res = await rateCounterparty(bountyId, appId, payload);
    await refresh();
    return res;
  }, [refresh]);

  return { loading, bounties, applications, refresh, apply, deliver, respondToInvite, rate };
}
