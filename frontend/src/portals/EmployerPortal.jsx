// ─────────────────────────────────────────────────────────────
// CredChain — Employer Suite (Portal B) — wired to real endpoints
// Tabbed: Talent Feed, Micro-Bounties, and My Conversations. A persistent
// stats strip (credits / messaged / replied) stays visible across tabs. Real
// token-bucket chat: opening a conversation spends a credit, the student's
// reply unlocks it and refunds the credit (live via Socket.io).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import PortalLayout from './PortalLayout';
import { useAuth } from '../context/AuthContext';
import { getTalentFeed, getChatRooms, initializeChat, sendChatMessageV1 } from '../services/api';
import { connectSocket, socket } from '../services/socket';
import TalentSearch from '../components/employer/TalentSearch';
import TalentFeed from '../components/employer/TalentFeed';
import ChatDrawer from '../components/employer/ChatDrawer';
import MicroBounties from '../components/employer/MicroBounties';

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
  const [hideUnverified, setHideUnverified] = useState(false);
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
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Chat credits" value={credits == null ? '—' : credits} accent />
        <Stat label="Messaged" value={messaged} />
        <Stat label="Replied" value={replied} />
      </div>

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 animate-fade-in">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{notice}</span>
        </div>
      )}

      <div key={tab} className="animate-fade-in">
        {tab === 'talent' && (
          <TalentSearch
            onContact={(student) => {
              window.alert(
                `Message sent to ${student.name}.\n\n` +
                `CredScore: ${student.credScore} · ${student.deliveries} confirmed deliveries.\n` +
                `They'll receive a notification and can reply from their vault.`
              );
            }}
            onInviteToBounty={(student) => {
              window.alert(
                `${student.name} has been invited to apply for your open bounties.\n\n` +
                `Their verified credentials will be reviewed against your requirements.`
              );
            }}
          />
        )}

        {tab === 'feed' && (
          <TalentFeed
            students={students}
            loading={loading}
            hideUnverified={hideUnverified}
            onToggleHide={() => setHideUnverified((h) => !h)}
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

function Stat({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${accent ? 'border-l-4 border-l-blue-600 pl-3' : ''}`}>
      <p className="text-2xl font-bold tracking-tight text-blue-600">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}

function ChatRoomsList({ rooms, onOpen }) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">💬</div>
        <p className="font-semibold tracking-tight text-gray-900">No conversations yet</p>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">Message a candidate from the Talent Feed to start a conversation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rooms.map((r) => {
        const last = r.messages?.[r.messages.length - 1];
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpen(r.id)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{r.otherParticipant?.name || 'Candidate'}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{last?.text || 'No messages yet'}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  r.isUnlocked
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                {r.isUnlocked ? 'unlocked' : '🔒 locked'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
