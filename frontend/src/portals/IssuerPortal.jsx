// ─────────────────────────────────────────────────────────────
// CredChain — Issuer Command Center (Portal C)
// Sidebar-driven: Get Verified (polymorphic onboarding wizard) + the
// verified-issuer tools — Issue, Bulk-Upload (maker-checker + live progress),
// Revocation Registry, Reputation, and the Proof-of-Skill Auto-Issuer.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import PortalLayout from './PortalLayout';
import { useAuth } from '../context/AuthContext';
import IssuerOnboardingWizard from '../components/issuer/IssuerOnboardingWizard';
import IssueCredentialPanel from '../components/issuer/IssueCredentialPanel';
import BulkUploadPanel from '../components/issuer/BulkUploadPanel';
import RevocationRegistry from '../components/issuer/RevocationRegistry';
import ReputationDashboard from '../components/issuer/ReputationDashboard';
import ProofOfSkillPanel from '../components/issuer/ProofOfSkillPanel';

const NAV = [
  { key: 'verify', label: 'Get Verified', icon: '✅' },
  { key: 'issue', label: 'Award a Skill', icon: '🎓' },
  { key: 'bulk', label: 'Award in Bulk', icon: '📤' },
  { key: 'revoke', label: 'Remove a Skill', icon: '🚫' },
  { key: 'reputation', label: 'Your Results', icon: '📊' },
];

const SUBTITLES = {
  verify: 'Get your organisation verified so the skills you award can’t be faked.',
  issue: 'Award a verified skill to one person, or let your judging platform do it automatically.',
  bulk: 'Award up to 500 verified skills at once, with a two-person sign-off.',
  revoke: 'Made a mistake? Remove a verified skill cleanly, with a permanent record of the change.',
  reputation: 'Real outcomes from your people — ready to share and show off.',
};

export default function IssuerPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState('verify');
  // Credentials minted this session — shared with the Revocation Registry.
  const [issued, setIssued] = useState([]);

  const addIssued = (cred) => setIssued((prev) => [cred, ...prev]);
  const markRevoked = (id) =>
    setIssued((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'revoked' } : c)));

  return (
    <PortalLayout
      title="Issuer Command Center"
      subtitle={SUBTITLES[tab]}
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      <div key={tab} className="animate-fade-in">
        {tab === 'verify' && <IssuerOnboardingWizard user={user} />}

        {tab === 'issue' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <IssueCredentialPanel onIssued={addIssued} />
            <ProofOfSkillPanel onIssued={addIssued} />
          </div>
        )}

        {tab === 'bulk' && (
          <div className="mx-auto max-w-2xl">
            <BulkUploadPanel userId={user?.id} />
          </div>
        )}

        {tab === 'revoke' && (
          <div className="mx-auto max-w-2xl">
            <RevocationRegistry issued={issued} onRevoked={markRevoked} />
          </div>
        )}

        {tab === 'reputation' && <ReputationDashboard />}
      </div>
    </PortalLayout>
  );
}
