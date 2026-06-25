// ─────────────────────────────────────────────────────────────
// CredChain — Student Vault (Portal A) — tabbed dashboard
// Sidebar-driven tabs: My Vault (score, AI, pending queue, two-tier ledger),
// Nigeria Country-Module features, recruiter Messages, and Share & Export.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import PortalLayout from './PortalLayout';
import { useAuth } from '../context/AuthContext';
import { useStudentVault } from '../hooks/useStudentVault';
import { computeCredScore } from '../lib/credScore';
import { disputeCredential } from '../services/api';

import CredScoreGauge from '../components/student/CredScoreGauge';
import StudentEarnTab from '../components/student/StudentEarnTab';
import VerificationPathways from '../components/student/VerificationPathways';
import AiCoPilotBar from '../components/student/AiCoPilotBar';
import PendingQueue from '../components/student/PendingQueue';
import TwoTierLedger from '../components/student/TwoTierLedger';
import OnChainProofModal from '../components/student/OnChainProofModal';
import ShareExportDrawer from '../components/student/ShareExportDrawer';
import MessagesInbox from '../components/student/MessagesInbox';
import StatementOfResultCard from '../components/student/nigeria/StatementOfResultCard';
import NyscTracker from '../components/student/nigeria/NyscTracker';
import GlobalTrustPass from '../components/student/nigeria/GlobalTrustPass';
import OfflinePass from '../components/student/nigeria/OfflinePass';

// Launch market. (When a country field is added to the User, read it here —
// kept out of any scoring path per the no-bias rule.)
const COUNTRY = 'NG';

const NAV = [
  { key: 'vault', label: 'My Vault', icon: '🏦' },
  { key: 'earn', label: 'Earn', icon: '💰' },
  { key: 'nigeria', label: 'Nigeria', icon: '🇳🇬' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'share', label: 'Share & Export', icon: '🔗' },
];

const SUBTITLES = {
  vault: "Your achievements, verified on Solana — no matter where you're from.",
  earn: 'Real companies. Real pay. Your verified skill is the application.',
  nigeria: 'Country-module features built for the Nigerian credential journey.',
  messages: "Reply to unlock conversations and refund the recruiter's credit.",
  share: 'Portable, verifiable proof — share it anywhere.',
};

export default function StudentPortal() {
  const { user } = useAuth();
  const vault = useStudentVault(user?.id);
  const [proof, setProof] = useState(null);
  const [tab, setTab] = useState('vault');

  const { score, breakdown, contributions } = useMemo(
    () => computeCredScore(vault.verified),
    [vault.verified]
  );

  const academicStatus = vault.academicStatus || 'in_school';

  async function handleDispute(credential) {
    const reason = window.prompt(
      'Briefly, why is this revocation wrong? This routes to an independent platform-admin review (not back to the issuer).',
      'Revoked in error — credential is legitimate.'
    );
    if (reason === null) return;
    try {
      await disputeCredential(credential.id, reason);
      await vault.refresh();
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Could not file the dispute.');
    }
  }

  const hasVerified = vault.verified.length > 0;

  return (
    <PortalLayout
      title={`Your Vault${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
      subtitle={SUBTITLES[tab]}
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
      credScore={score}
    >
      {vault.loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading your vault…</span>
        </div>
      ) : (
        <div key={tab} className="animate-fade-in">
          {tab === 'vault' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CredScoreGauge
                  score={score}
                  breakdown={breakdown}
                  contributions={contributions}
                  academicStatus={academicStatus}
                />
                <AiCoPilotBar
                  userId={user?.id}
                  countryCode={COUNTRY}
                  telemetry={vault.telemetry}
                  onTelemetry={vault.setTelemetry}
                />
              </div>
              <PendingQueue pending={vault.pending} onAccept={vault.accept} onReject={vault.reject} />
              <TwoTierLedger
                verified={vault.verified}
                revoked={vault.revoked}
                sandbox={vault.sandbox}
                onViewProof={setProof}
                onDispute={handleDispute}
                onAddSandbox={vault.addSandbox}
              />
              <VerificationPathways
                onSelectPathway={(pathway) => {
                  if (pathway === 'platform') window.alert('Connect a platform — OAuth flow');
                  if (pathway === 'institutional') setTab('nigeria');
                }}
              />
            </div>
          )}

          {tab === 'earn' && (
            <StudentEarnTab
              verified={vault.verified || []}
              credScore={score}
              academicStatus={academicStatus}
              onApply={(bounty) => {
                window.alert(
                  `Applied for "${bounty.title}" from ${bounty.company}.\n\n` +
                  `The employer will review your CredScore (${score}) and your verified credentials. ` +
                  `If selected, payment of ${bounty.reward} will be locked in Solana escrow before you start.`
                );
              }}
            />
          )}

          {tab === 'nigeria' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatementOfResultCard verified={vault.verified} />
              <NyscTracker />
              <GlobalTrustPass countryCode={COUNTRY} hasVerified={hasVerified} />
              <OfflinePass user={user} verified={vault.verified} />
            </div>
          )}

          {tab === 'messages' && <MessagesInbox meId={user?.id} />}

          {tab === 'share' && <ShareExportDrawer user={user} verified={vault.verified} />}
        </div>
      )}

      {proof && <OnChainProofModal credential={proof} onClose={() => setProof(null)} />}
    </PortalLayout>
  );
}
