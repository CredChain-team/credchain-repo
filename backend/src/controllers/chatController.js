// ─────────────────────────────────────────────────────────────
// CredChain Backend — Token-Bucket Anti-Spam Chat (System 6)
// Employers spend a chat credit to open a conversation. The credit is
// REFUNDED the instant the student replies — so genuine, reciprocated
// outreach is free, while spam (no reply) steadily drains the bucket.
//
//   initializeConversation → employer credit -1, room opens locked.
//   sendMessage            → recipient's first reply unlocks + refunds +1.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const User = require('../models/User');
const ChatRoom = require('../models/ChatRoom');
const EmployerProfile = require('../models/EmployerProfile');

/** Create-or-fetch an employer's profile (with the default 50-credit bucket). */
async function ensureEmployerProfile(userId) {
  let profile = await EmployerProfile.findOne({ userId });
  if (!profile) profile = await EmployerProfile.create({ userId });
  return profile;
}

// POST /api/v1/chat/initialize   (requireAuth + requireRole('employer'))
// Body: { recipientId, contextCredentialId?, text? }
async function initializeConversation(req, res) {
  try {
    const { recipientId, contextCredentialId, text } = req.body || {};
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: 'A valid recipientId is required.' });
    }
    if (String(recipientId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot open a chat with yourself.' });
    }

    const recipient = await User.findById(recipientId).select('_id');
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    // Reuse an existing room between these two participants if one exists —
    // never charge twice for the same conversation.
    const existing = await ChatRoom.findOne({
      participants: { $all: [req.user.id, recipientId], $size: 2 },
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Conversation already open.',
        room: existing,
        chargedCredit: false,
      });
    }

    // Token bucket: must have a credit to spend.
    const employer = await ensureEmployerProfile(req.user.id);
    if (employer.chatCreditsRemaining <= 0) {
      return res.status(402).json({
        success: false,
        message: 'Out of chat credits. Credits are refunded when recipients reply.',
        chatCreditsRemaining: 0,
      });
    }

    // Deduct atomically (guard against a race double-spend).
    const debited = await EmployerProfile.findOneAndUpdate(
      { userId: req.user.id, chatCreditsRemaining: { $gt: 0 } },
      { $inc: { chatCreditsRemaining: -1 } },
      { new: true }
    );
    if (!debited) {
      return res.status(402).json({ success: false, message: 'Out of chat credits.' });
    }

    const room = await ChatRoom.create({
      participants: [req.user.id, recipientId],
      initiatedBy: req.user.id,
      contextCredentialId: contextCredentialId && mongoose.Types.ObjectId.isValid(contextCredentialId)
        ? contextCredentialId
        : undefined,
      isUnlocked: false,
      messages: text ? [{ from: req.user.id, text }] : [],
    });

    // Notify the recipient in realtime.
    const io = req.app.get('io');
    if (io) io.to(String(recipientId)).emit('chat:room-opened', { roomId: room._id, from: req.user.id });

    return res.status(201).json({
      success: true,
      message: 'Conversation opened. 1 credit held — refunded when they reply.',
      room,
      chargedCredit: true,
      chatCreditsRemaining: debited.chatCreditsRemaining,
    });
  } catch (err) {
    console.error('[chat:initialize]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to open conversation.' });
  }
}

// POST /api/v1/chat/:roomId/message   (requireAuth)
async function sendMessage(req, res) {
  try {
    const { roomId } = req.params;
    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: 'Invalid roomId.' });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    // Only participants may post.
    const isParticipant = room.participants.some((p) => String(p) === String(req.user.id));
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'You are not in this conversation.' });
    }

    room.messages.push({ from: req.user.id, text: text.trim() });

    // Anti-spam unlock + refund: if the room is still locked and the sender
    // is the RECIPIENT (i.e. not the employer who opened it), this is the
    // reply that proves the outreach was wanted.
    let refunded = false;
    const senderIsInitiator = String(room.initiatedBy) === String(req.user.id);
    if (!room.isUnlocked && !senderIsInitiator) {
      room.isUnlocked = true;
      if (!room.creditRefunded) {
        await EmployerProfile.updateOne(
          { userId: room.initiatedBy },
          { $inc: { chatCreditsRemaining: 1 } }
        );
        room.creditRefunded = true;
        refunded = true;
      }
    }

    await room.save();

    // Relay to the other participant(s).
    const io = req.app.get('io');
    if (io) {
      room.participants
        .filter((p) => String(p) !== String(req.user.id))
        .forEach((p) => io.to(String(p)).emit('chat:message', {
          roomId: room._id,
          from: req.user.id,
          text: text.trim(),
        }));
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      isUnlocked: room.isUnlocked,
      creditRefundedToEmployer: refunded,
    });
  } catch (err) {
    console.error('[chat:sendMessage]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
}

// GET /api/v1/chat/rooms   (requireAuth)
// Every conversation the caller participates in, with the other participant's
// name, the pinned context credential, and the message thread.
async function listRooms(req, res) {
  try {
    const rooms = await ChatRoom.find({ participants: req.user.id }).sort({ updatedAt: -1 });

    const otherIds = [...new Set(rooms.map((r) => r.participants.find((p) => String(p) !== String(req.user.id))).map(String).filter(Boolean))];
    const credIds = [...new Set(rooms.map((r) => r.contextCredentialId).filter(Boolean).map(String))];

    const Credential = require('../models/Credential');
    const [users, creds] = await Promise.all([
      User.find({ _id: { $in: otherIds } }).select('name role'),
      Credential.find({ _id: { $in: credIds } }).select('title issuer'),
    ]);
    const userById = new Map(users.map((u) => [String(u._id), u]));
    const credById = new Map(creds.map((c) => [String(c._id), c]));

    const shaped = rooms.map((r) => {
      const otherId = r.participants.find((p) => String(p) !== String(req.user.id));
      const other = userById.get(String(otherId));
      const ctx = r.contextCredentialId ? credById.get(String(r.contextCredentialId)) : null;
      return {
        id: r._id,
        otherParticipant: { id: otherId, name: other?.name || 'User', role: other?.role || null },
        initiatedBy: r.initiatedBy,
        iInitiated: String(r.initiatedBy) === String(req.user.id),
        isUnlocked: r.isUnlocked,
        context: ctx ? { id: ctx._id, title: ctx.title, issuer: ctx.issuer } : null,
        messages: (r.messages || []).map((m) => ({ from: m.from, text: m.text, sentAt: m.sentAt })),
        updatedAt: r.updatedAt,
      };
    });

    return res.status(200).json({ success: true, count: shaped.length, rooms: shaped });
  } catch (err) {
    console.error('[chat:listRooms]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load conversations.' });
  }
}

module.exports = { initializeConversation, sendMessage, listRooms, ensureEmployerProfile };
