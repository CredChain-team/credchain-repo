// ─────────────────────────────────────────────────────────────
// CredChain — Employer Suite (Portal B) — wired to real endpoints
// Tabbed: Talent Feed, Micro-Bounties, and My Conversations. A persistent
// stats strip (credits / messaged / replied) stays visible across tabs. Real
// token-bucket chat: opening a conversation spends a credit, the student's
// reply unlocks it and refunds the credit (live via Socket.io).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Coins, Send, CheckCircle2, Lock, MessageSquare } from 'lucide-react';
import PortalLayout from './PortalLayout';
import { useAuth } from '../context/AuthContext';
import { getTalentFeed, getChatRooms, initializeChat, sendChatMessageV1 } from '../services/api';
import { connectSocket, socket } from '../services/socket';
import TalentSearch from '../components/employer/TalentSearch';
import TalentFeed from '../components/employer/TalentFeed';
import ChatDrawer from '../components/employer/ChatDrawer';
import MicroBounties from '../components/employer/MicroBounties';
import { StatCard, Card, Avatar, Badge, EmptyState } from '../components/ui';
import { fadeUp, stagger, staggerItem } from '../theme/motion';

const NAV = [
  { key: 'talent', label: 'Find Talent', icon: '🔍' },
  { key: 'feed', label: 'Talent Feed', icon: '👥' },
  { key: 'bounties', label: 'Bounties', icon: '💰' },
  { key: 'chats', label: 'My Conversations', icon: '💬' },
];

const SUBTITLES = {
  talent: 'Search verified students and graduates by skill, tier, and delivery history.',
  feed: 'The blockchain confirms it instantly — and the issuer behind it is independently checkable.',
  bounties: 'Post skill challenges. Pre-test talent before you hire.',
  chats: 'Outreach is refunded the moment a candidate replies.',
};

export default function EmployerPortal() {
  const { user } = useAuth();
  const [skillView, setSkillView] = useState('all'); // 'verified' | 'attested' | 'all'
  const [students, setStudents] = useState([]);
  const [credits, setCredits] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState('talent');
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const loadFeed = useCallback(async () => {
    try {
      const data = await getTalentFeed();
      setStudents(data?.students || []);
      setCredits(data?.chatCreditsRemaining ?? null);
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const data = await getChatRooms();
      setRooms(data?.rooms || []);
    } catch {
      /* keep prior */
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    loadFeed();
    loadRooms();
    connectSocket(user.id);
    const onMessage = (payload) => {
      // Append live; a student reply also unlocks + refunds, so refresh both.
      setRooms((prev) => {
        const idx = prev.findIndex((r) => String(r.id) === String(payload.roomId));
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, { from: payload.from, text: payload.text }] };
        return copy;
      });
      loadRooms();
      loadFeed(); // pick up any credit refund
    };
    socket.on('chat:message', onMessage);
    return () => socket.off('chat:message', onMessage);
  }, [user?.id, loadFeed, loadRooms]);

  async function openChat(student, contextCredential) {
    setNotice(null);
    const existing = rooms.find((r) => String(r.otherParticipant?.id) === String(student.id));
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    try {
      const res = await initializeChat({
        recipientId: student.id,
        contextCredentialId: contextCredential?.id,
      });
      if (typeof res?.chatCreditsRemaining === 'number') setCredits(res.chatCreditsRemaining);
      const data = await getChatRooms();
      setRooms(data?.rooms || []);
      const opened = (data?.rooms || []).find((r) => String(r.otherParticipant?.id) === String(student.id));
      if (opened) setActiveId(opened.id);
    } catch (err) {
      setNotice(
        err?.response?.status === 402
          ? 'Out of chat credits. Credits are refunded when candidates reply.'
          : err?.response?.data?.message || 'Could not open the conversation.'
      );
    }
  }

  async function send(text) {
    const roomId = activeIdRef.current;
    if (!roomId) return;
    setRooms((prev) =>
      prev.map((r) => (String(r.id) === String(roomId) ? { ...r, messages: [...r.messages, { from: user.id, text }] } : r))
    );
    try {
      await sendChatMessageV1(roomId, text);
    } catch {
      /* optimistic; socket/load will reconcile */
    }
  }

  const activeRoom = activeId ? rooms.find((r) => String(r.id) === String(activeId)) : null;
  const messaged = rooms.filter((r) => r.iInitiated).length;
  const replied = rooms.filter((r) => r.iInitiated && r.isUnlocked).length;

  return (
    <PortalLayout
      title="Recruiter Terminal"
      subtitle={SUBTITLES[tab]}
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      {/* Persistent stats strip */}
      <motion.div variants={stagger(0.06)} initial="initial" animate="animate" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div variants={staggerItem}>
          <StatCard label="Chat credits" value={credits == null ? 0 : credits} icon={Coins} tone="brand" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard label="Messaged" value={messaged} icon={Send} tone="violet" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard label="Replied" value={replied} icon={CheckCircle2} tone="success" />
        </motion.div>
      </motion.div>

      {notice && (
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning-500/40 bg-warning-500/12 px-4 py-3 text-sm text-warning-500"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </motion.div>
      )}

      <div key={tab}>
        {tab === 'talent' && (
          <TalentSearch
            onContact={(student) => openChat(student)}
            onInviteToBounty={() => setTab('bounties')}
          />
        )}

        {tab === 'feed' && (
          <TalentFeed
            students={students}
            loading={loading}
            skillView={skillView}
            onChangeView={setSkillView}
            onMessage={openChat}
            employerName={user?.name}
          />
        )}

        {tab === 'bounties' && <MicroBounties isEmployer={true} />}

        {tab === 'chats' && <ChatRoomsList rooms={rooms} onOpen={(id) => setActiveId(id)} />}
      </div>

      <ChatDrawer room={activeRoom} meId={user?.id} onClose={() => setActiveId(null)} onSend={send} />
    </PortalLayout>
  );
}

function ChatRoomsList({ rooms, onOpen }) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        description="Message a candidate from the Talent Feed to start a conversation."
      />
    );
  }

  return (
    <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-3">
      {rooms.map((r) => {
        const last = r.messages?.[r.messages.length - 1];
        return (
          <motion.div key={r.id} variants={staggerItem}>
            <Card
              padding="none"
              as="button"
              onClick={() => onOpen(r.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={r.otherParticipant?.name || 'Candidate'} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content-primary">{r.otherParticipant?.name || 'Candidate'}</p>
                  <p className="mt-0.5 truncate text-xs text-content-muted">{last?.text || 'No messages yet'}</p>
                </div>
              </div>
              <Badge tone={r.isUnlocked ? 'success' : 'warning'} variant="soft" icon={r.isUnlocked ? <CheckCircle2 /> : <Lock />}>
                {r.isUnlocked ? 'Unlocked' : 'Locked'}
              </Badge>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
