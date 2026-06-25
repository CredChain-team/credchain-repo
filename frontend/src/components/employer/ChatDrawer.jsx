// ─────────────────────────────────────────────────────────────
// CredChain — Token-Bucket Anti-Spam Chat drawer (Section 4.2)
// Backed by the real /api/v1/chat endpoints. A room opens LOCKED (employer
// spent a credit); it unlocks + refunds when the student replies (live via
// Socket.io). The triggering verified credential is auto-pinned.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Lock, CheckCircle2, Pin } from 'lucide-react';
import { Avatar, Badge } from '../ui';

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
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={room.otherParticipant?.name || 'Candidate'} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-content-primary">{room.otherParticipant?.name || 'Candidate'}</p>
            {room.isUnlocked ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-600">
                <CheckCircle2 className="h-3 w-3" /> Unlocked · credit refunded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning-500">
                <Lock className="h-3 w-3" /> Locked until they reply
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-content-muted transition-colors hover:bg-bg-sunken hover:text-content-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {room.context && (
        <div className="flex items-center gap-1.5 border-b border-border-subtle bg-bg-sunken px-4 py-2 text-xs">
          <Pin className="h-3 w-3 shrink-0 text-content-muted" />
          <span className="text-content-muted">Re:</span>
          <span className="truncate font-medium text-brand-600">{room.context.title}</span>
          {room.context.issuer && <span className="truncate text-content-muted">· {room.context.issuer}</span>}
        </div>
      )}

      {/* Messages */}
      <div className="max-h-60 space-y-2 overflow-y-auto px-4 py-3">
        {room.messages.length === 0 && (
          <p className="py-6 text-center text-xs text-content-muted">Say hello — outreach is free once they reply.</p>
        )}
        {room.messages.map((m, i) => {
          const mine = String(m.from) === String(meId);
          return (
            <div
              key={i}
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                mine
                  ? 'ml-auto rounded-br-md bg-brand-600 text-white'
                  : 'mr-auto rounded-bl-md bg-bg-sunken text-content-primary'
              }`}
            >
              {m.text}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border-subtle p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="h-10 w-full flex-1 rounded-lg border border-border-subtle bg-bg-elevated px-3 text-sm text-content-primary transition-colors placeholder:text-content-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </motion.div>
  );
}
