// ─────────────────────────────────────────────────────────────
// CredChain — Student Messages inbox (closes the chat loop)
// Lists conversations from real employers. The student's first reply is what
// UNLOCKS the room and REFUNDS the employer's chat credit (token-bucket,
// backend-enforced). Live via Socket.io.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Lock, Pin, Send, CheckCircle2 } from 'lucide-react';
import { getChatRooms, sendChatMessageV1 } from '../../services/api';
import { connectSocket, socket } from '../../services/socket';
import { Avatar, Badge, EmptyState, Skeleton } from '../ui';

export default function MessagesInbox({ meId }) {
  const [rooms, setRooms] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  async function load() {
    try {
      const data = await getChatRooms();
      setRooms(data?.rooms || []);
    } catch {
      /* leave as-is */
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    if (!meId) return undefined;
    load();
    connectSocket(meId);
    const onMessage = (payload) => {
      // Append to the matching room; refresh if it's a room we don't have yet.
      setRooms((prev) => {
        const idx = prev.findIndex((r) => String(r.id) === String(payload.roomId));
        if (idx === -1) {
          load();
          return prev;
        }
        const copy = [...prev];
        copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, { from: payload.from, text: payload.text }] };
        return copy;
      });
    };
    const onOpened = () => load();
    socket.on('chat:message', onMessage);
    socket.on('chat:room-opened', onOpened);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:room-opened', onOpened);
    };
  }, [meId]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;
    setText('');
    try {
      const res = await sendChatMessageV1(activeId, body);
      setRooms((prev) =>
        prev.map((r) =>
          String(r.id) === String(activeId)
            ? { ...r, messages: [...r.messages, { from: meId, text: body }], isUnlocked: res?.isUnlocked ?? r.isUnlocked }
            : r
        )
      );
    } catch {
      setText(body); // restore on failure
    }
  }

  const active = rooms.find((r) => String(r.id) === String(activeId)) || null;
  const unread = rooms.filter((r) => !r.isUnlocked).length;

  return (
    <section className="overflow-hidden rounded-lg border border-border-subtle bg-bg-elevated shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-content-primary">
          <MessageSquare className="h-4 w-4 text-brand-600" /> Messages
        </h3>
        {unread > 0 && <Badge tone="brand" variant="solid" size="sm">{unread}</Badge>}
      </div>

      {!loaded && (
        <div className="space-y-3 p-5">
          <Skeleton variant="text" lines={2} />
          <Skeleton h={48} />
          <Skeleton h={48} />
        </div>
      )}

      {loaded && rooms.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          description="Recruiters who find your verified credentials can reach out here."
        />
      )}

      {rooms.length > 0 && (
        <div className="grid sm:grid-cols-[240px_1fr]">
          {/* Room list */}
          <div className="divide-y divide-border-subtle border-b border-border-subtle sm:border-b-0 sm:border-r">
            {rooms.map((r) => {
              const activeRoom = String(activeId) === String(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ${activeRoom ? 'bg-bg-brand-soft' : 'hover:bg-bg-sunken'}`}
                >
                  <Avatar name={r.otherParticipant?.name || 'Recruiter'} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-content-primary">{r.otherParticipant?.name || 'Recruiter'}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-medium ${r.isUnlocked ? 'text-accent-600 dark:text-accent-400' : 'text-warning-500'}`}>
                      {r.isUnlocked ? <><CheckCircle2 className="h-3 w-3" /> unlocked</> : <><Lock className="h-3 w-3" /> reply to unlock</>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Thread */}
          <div className="p-4">
            {!active ? (
              <p className="py-8 text-center text-sm text-content-muted">Select a conversation.</p>
            ) : (
              <>
                {active.context && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-sunken px-3 py-1.5 text-xs">
                    <Pin className="h-3 w-3 text-content-muted" />
                    <span className="text-content-muted">Re:</span>
                    <span className="font-medium text-brand-600">{active.context.title}</span>
                  </div>
                )}
                <div className="max-h-48 space-y-2 overflow-y-auto scroll-thin">
                  {active.messages.length === 0 && <p className="text-center text-xs text-content-muted">No messages yet.</p>}
                  {active.messages.map((m, i) => (
                    <div key={i} className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${String(m.from) === String(meId) ? 'ml-auto bg-brand-600 text-white' : 'bg-bg-sunken text-content-primary'}`}>
                      {m.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="mt-3 flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply…"
                    className="h-11 w-full flex-1 rounded-md border border-border-subtle bg-bg-elevated px-3.5 text-sm text-content-primary placeholder:text-content-muted transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-700 active:scale-[0.97]"
                  >
                    <Send className="h-4 w-4" /> Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
