// ─────────────────────────────────────────────────────────────
// CredChain — Token-Bucket Anti-Spam Chat drawer (Section 4.2)
// Backed by the real /api/v1/chat endpoints. A room opens LOCKED (employer
// spent a credit); it unlocks + refunds when the student replies (live via
// Socket.io). The triggering verified credential is auto-pinned.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

export default function ChatDrawer({ room, meId, onClose, onSend }) {
  const [text, setText] = useState('');
  if (!room) return null;

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 animate-slide-up">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{room.otherParticipant?.name || 'Candidate'}</p>
          <p className="text-[11px]">
            {room.isUnlocked
              ? <span className="font-medium text-emerald-600">Unlocked · credit refunded</span>
              : <span className="font-medium text-amber-600">🔒 LOCKED until they reply</span>}
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600">✕</button>
      </div>

      {room.context && (
        <div className="border-b border-gray-100 bg-slate-50 px-4 py-2 text-xs">
          <span className="text-gray-400">📌 Re: </span>
          <span className="font-medium text-blue-700">{room.context.title}</span>
          {room.context.issuer && <span className="text-gray-400"> · {room.context.issuer}</span>}
        </div>
      )}

      <div className="max-h-56 space-y-2 overflow-y-auto px-4 py-3">
        {room.messages.length === 0 && <p className="text-center text-xs text-gray-400">Say hello — outreach is free once they reply.</p>}
        {room.messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${String(m.from) === String(meId) ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
            {m.text}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-gray-100 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button type="submit" className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97]">Send</button>
      </form>
    </div>
  );
}
