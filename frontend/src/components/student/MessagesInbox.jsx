// ─────────────────────────────────────────────────────────────
// CredChain — Student Messages inbox (closes the chat loop)
// Lists conversations from real employers. The student's first reply is what
// UNLOCKS the room and REFUNDS the employer's chat credit (token-bucket,
// backend-enforced). Live via Socket.io.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { getChatRooms, sendChatMessageV1 } from '../../services/api';
import { connectSocket, socket } from '../../services/socket';

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

  function initials(name) {
    return (name || 'R').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'R';
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Messages</h3>
        {unread > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-medium text-white">{unread}</span>
        )}
      </div>

      {loaded && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">💬</div>
          <p className="font-semibold tracking-tight text-gray-900">No messages yet</p>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">Recruiters who find your verified credentials can reach out here.</p>
        </div>
      )}

      {rooms.length > 0 && (
        <div className="grid sm:grid-cols-[220px_1fr]">
          {/* Room list */}
          <div className="divide-y divide-gray-50 border-b border-gray-100 sm:border-b-0 sm:border-r">
            {rooms.map((r) => {
              const activeRoom = String(activeId) === String(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 ${activeRoom ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {initials(r.otherParticipant?.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{r.otherParticipant?.name || 'Recruiter'}</span>
                    <span className={`text-[10px] font-medium ${r.isUnlocked ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {r.isUnlocked ? 'unlocked' : '🔒 reply to unlock'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Thread */}
          <div className="p-4">
            {!active ? (
              <p className="py-8 text-center text-sm text-gray-400">Select a conversation.</p>
            ) : (
              <>
                {active.context && (
                  <div className="mb-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-1.5 text-xs">
                    <span className="text-gray-400">📌 Re: </span>
                    <span className="font-medium text-blue-700">{active.context.title}</span>
                  </div>
                )}
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {active.messages.length === 0 && <p className="text-center text-xs text-gray-400">No messages yet.</p>}
                  {active.messages.map((m, i) => (
                    <div key={i} className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${String(m.from) === String(meId) ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {m.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="mt-3 flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply…"
                    className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97]"
                  >
                    Send
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
