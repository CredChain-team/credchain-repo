// ─────────────────────────────────────────────────────────────
// CredChain — Student Vault (Portal A) — tabbed dashboard
// Sidebar-driven tabs: My Vault (score, AI, pending queue, two-tier ledger),
// Nigeria Country-Module features, recruiter Messages, and Share & Export.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { Vault, Coins, Flag, MessageSquare, Share2, Loader2 } from 'lucide-react';
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
  { key: 'vault', label: 'My Vault', icon: <Vault className="h-[18px] w-[18px]" /> },
  { key: 'earn', label: 'Earn', icon: <Coins className="h-[18px] w-[18px]" /> },
  { key: 'nigeria', label: 'Nigeria', icon: <Flag className="h-[18px] w-[18px]" /> },
  { key: 'messages', label: 'Messages', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
  { key: 'share', label: 'Share & Export', icon: <Share2 className="h-[18px] w-[18px]" /> },
];

const SUBTITLES = {
  vault: "Your skills and certificates, verified and locked in — no matter where you're from.",
  earn: 'Real companies. Real pay. Your verified skill is the application.',
  nigeria: 'Features built for the Nigerian student journey.',
  messages: 'Reply to open the conversation and give the recruiter their credit back.',
  share: 'Proof anyone can check — share it anywhere.',
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
      'In a sentence, why is this wrong? An independent CredChain reviewer looks at it — not the school or employer who removed it.',
      'Removed by mistake — this is real.'
    );
    if (reason === null) return;
    try {
      await disputeCredential(credential.id, reason);
      await vault.refresh();
    } catch (err) {
      window.alert(err?.response?.data?.message || 'Could not send your request.');
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
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-content-secondary">Loading your skills…</span>
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
                  if (pathway === 'platform') window.alert('Connect an account to import your skills');
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
                  `The employer will look at your CredScore (${score}) and your verified skills. ` +
                  `If they pick you, the ${bounty.reward} payment is held safely up front before you start — so you know you'll get paid.`
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
