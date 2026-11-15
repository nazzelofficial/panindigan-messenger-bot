/**
 * Compatibility adapter between panindigan-automate (`MessengerClient`) and the
 * legacy API surface this bot was built against (previously provided by
 * panindigan-fca).
 *
 * panindigan-automate is a from-scratch, strictly-typed client: promise-based
 * methods (`sendMessage(threadId, { type: 'text', ... })`), typed events
 * (`message`, `message_reply`, `participant_join`, …) and no global callback
 * style API. This module wraps it once and re-exposes the two shapes the
 * command layer expects:
 *
 *   1. The namespaced shape used by `main.ts` — `api.messages.send()`,
 *      `api.messages.unsend()`, `api.users.getSelf()`, `api.users.getProfile()`,
 *      `api.threads.addParticipants()`.
 *   2. The legacy flat shape used by the commands — `api.sendMessage()`,
 *      `api.unsendMessage()`, `api.getThreadInfo()`, `api.getUserInfo()`,
 *      `api.getThreadList()`, `api.getCurrentUserID()`, `api.setTitle()`,
 *      `api.changeNickname()`, `api.changeThreadColor()`,
 *      `api.changeThreadEmoji()`, `api.changeAdminStatus()`,
 *      `api.addUserToGroup()`, `api.removeUserFromGroup()`.
 *
 * Events are mapped to the legacy `event` payload shape the handlers in
 * `main.ts` consume:
 *
 *   - automate `message`        → legacy `{ type: 'message', messageID, threadID, senderID, … }`
 *   - automate `message_reply`  → legacy `{ type: 'message_reply', …, messageReply: {…} }`
 *   - automate `participant_join`  → legacy `{ type: 'event', logMessageType: 'log:subscribe', … }`
 *   - automate `participant_leave` → legacy `{ type: 'event', logMessageType: 'log:unsubscribe', … }` (one event per removed user)
 *
 * Known limitations (panindigan-automate does not expose these yet):
 *
 *   - Thread admin lists (`threadInfo.adminIDs`) are always `[]`. Admin checks
 *     in `lib/permissions.ts` fall back to the configured admin list.
 *   - `appstate:update` is never emitted. panindigan-automate refreshes and
 *     persists cookies itself (default `./panindigan-session`), preferring the
 *     persisted jar over the supplied appstate on the next login.
 *   - `messageReply.senderID`/`attachments` (the replied-to message, not the
 *     reply) are looked up via `getMessages()` on a best-effort basis; if the
 *     lookup fails the reply event only carries `messageReply.messageID`.
 */

import axios from 'axios';
import { MessengerClient } from 'panindigan-automate';
import type {
  MessageEvent,
  MessageReplyEvent,
  ParticipantJoinEvent,
  ParticipantLeaveEvent,
  ThreadInfo,
} from 'panindigan-automate';
import { BotLogger } from './logger.js';

// ---------------------------------------------------------------------------
// Legacy event mapping
// ---------------------------------------------------------------------------

export interface LegacyMessageEvent {
  type: 'message' | 'message_reply';
  messageID: string;
  threadID: string;
  senderID: string;
  body: string;
  attachments: any[];
  timestamp: number;
  isGroup: boolean;
  isSelf: boolean;
  mentions: any[];
  messageReply?: {
    messageID: string;
    senderID?: string;
    body?: string | null;
    attachments?: any[];
    timestamp?: number;
  };
}

function toLegacyMessage(e: MessageEvent): LegacyMessageEvent {
  return {
    type: 'message',
    messageID: e.messageId,
    threadID: e.threadId,
    senderID: e.senderId,
    body: e.body ?? '',
    attachments: [...e.attachments],
    timestamp: e.timestamp,
    isGroup: e.isGroup,
    isSelf: e.isSelf,
    mentions: [...e.mentions],
  };
}

// Best-effort cache for replied-to messages (avoids one getMessages() call per
// reply inside busy groups). Entries expire after 5 minutes, capped at 200.
const REPLIED_CACHE_TTL_MS = 5 * 60 * 1000;
const REPLIED_CACHE_MAX = 200;
const repliedMessageCache = new Map<string, { value: ReplyEnrichment | null; expires: number }>();

interface ReplyEnrichment {
  senderId: string;
  body: string | null;
  attachments: any[];
  timestamp: number;
}

function readRepliedCache(key: string): ReplyEnrichment | null | undefined {
  const entry = repliedMessageCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    repliedMessageCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeRepliedCache(key: string, value: ReplyEnrichment | null): void {
  if (repliedMessageCache.size >= REPLIED_CACHE_MAX) {
    const oldest = repliedMessageCache.keys().next().value;
    if (oldest !== undefined) repliedMessageCache.delete(oldest);
  }
  repliedMessageCache.set(key, { value, expires: Date.now() + REPLIED_CACHE_TTL_MS });
}

async function enrichRepliedMessage(
  client: MessengerClient,
  e: MessageReplyEvent,
): Promise<ReplyEnrichment | null> {
  const cached = readRepliedCache(e.repliedToMessageId);
  if (cached !== undefined) return cached;

  try {
    const { messages } = await client.getMessages(e.threadId, { limit: 15 });
    const found = messages.find((m) => m.id === e.repliedToMessageId) ?? null;
    const value: ReplyEnrichment | null = found
      ? {
          senderId: found.senderId,
          body: found.body,
          attachments: [...found.attachments],
          timestamp: found.timestamp,
        }
      : null;
    writeRepliedCache(e.repliedToMessageId, value);
    return value;
  } catch (error) {
    BotLogger.debug(
      `Could not resolve replied-to message ${e.repliedToMessageId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    writeRepliedCache(e.repliedToMessageId, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Legacy thread/user mapping
// ---------------------------------------------------------------------------

function toLegacyThread(t: ThreadInfo): any {
  return {
    ...t,
    threadID: t.id,
    threadName: t.name,
    participantIDs: [...t.participantIds],
    // panindigan-automate does not expose thread admin lists yet.
    adminIDs: [],
    userInfo: t.participants.map((p) => ({ id: p.id, name: p.name })),
  };
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface AutomationClientOptions {
  /** Parsed appstate array (cookies) — same file/env source as before. */
  appState: unknown[];
  /** Directory panindigan-automate persists the refreshed session to. */
  storageDirectory?: string;
  /** Log level for the automate library itself. Default `warn`. */
  logLevel?: string;
}

/**
 * Builds a panindigan-automate client wrapped in the legacy compatibility
 * surface. Call `connect()` after registering listeners.
 */
export function createAutomationClient(options: AutomationClientOptions) {
  const appState = options.appState;

  const client = new MessengerClient({
    logLevel: options.logLevel ?? process.env.PANINDIGAN_LOG_LEVEL ?? 'warn',
    persistSession: true,
    storageDirectory: options.storageDirectory ?? process.env.PANINDIGAN_SESSION_DIR ?? './panindigan-session',
  });

  // -- internal helpers -----------------------------------------------------

  async function sendInternal(threadId: unknown, opts: any = {}): Promise<any> {
    const targetThread = String(threadId ?? '').trim();
    if (!targetThread) {
      throw new Error('messages.send: threadId is required');
    }

    const body = opts.body != null ? String(opts.body) : '';
    const mentions = Array.isArray(opts.mentions)
      ? opts.mentions
          .filter((m: any) => m && m.id != null && m.tag != null)
          .map((m: any) => ({
            id: String(m.id).trim(),
            tag: String(m.tag),
            ...(typeof m.fromIndex === 'number' ? { fromIndex: m.fromIndex } : {}),
          }))
      : undefined;

    let result: any = null;

    // Text part first (caption), then media — automate has no combined
    // body+attachment message type.
    if (body.trim().length > 0) {
      result = await client.sendMessage(targetThread, {
        type: 'text',
        body,
        ...(mentions && mentions.length > 0 ? { mentions } : {}),
      });
    }

    for (const file of toArray<any>(opts.attachment)) {
      result = await client.sendAttachment(targetThread, file);
    }

    for (const url of toArray<string>(opts.url)) {
      const response = await axios.get(String(url), { responseType: 'arraybuffer', timeout: 60_000 });
      result = await client.sendAttachment(targetThread, Buffer.from(response.data));
    }

    if (opts.sticker) {
      result = await client.sendSticker(targetThread, String(opts.sticker));
    }

    if (!result) {
      throw new Error('messages.send: nothing to send (empty body and no attachment, url or sticker)');
    }

    return result;
  }

  async function getUserInfo(ids: string | string[] | number | number[]): Promise<Record<string, any>> {
    const list = toArray<string | number>(ids as any)
      .map((id) => String(id).trim())
      .filter((id) => id.length > 0);

    const out: Record<string, any> = {};
    // Bounded fan-out: automate fetches one profile per request.
    for (const idsChunk of chunk(list, 8)) {
      const results = await Promise.allSettled(idsChunk.map((id) => client.getUser(id)));
      results.forEach((settled, index) => {
        if (settled.status === 'fulfilled' && settled.value) {
          out[idsChunk[index]] = { ...settled.value };
        }
      });
    }
    return out;
  }

  async function addParticipants(threadId: unknown, userIds: string[] | string): Promise<void> {
    const id = String(threadId ?? '').trim();
    const targets = toArray<string>(userIds as any).map((u) => String(u).trim()).filter(Boolean);
    const errors: Error[] = [];
    for (const userId of targets) {
      try {
        await client.addParticipant(id, userId);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (errors.length > 0) {
      throw new Error(`addParticipants: ${errors.length}/${targets.length} failed — ${errors[0].message}`);
    }
  }

  function toLegacyGroupEvent(kind: 'join' | 'leave', e: ParticipantJoinEvent | ParticipantLeaveEvent): any {
    if (kind === 'join') {
      const join = e as ParticipantJoinEvent;
      return {
        type: 'event',
        logMessageType: 'log:subscribe',
        threadID: join.threadId,
        timestamp: join.timestamp,
        senderID: join.addedBy,
        logMessageData: {
          addedParticipants: join.addedIds.map((id) => ({ userFbId: id, id, fullName: 'Member' })),
          added_by: join.addedBy,
        },
      };
    }
    const leave = e as ParticipantLeaveEvent;
    // handleEvent() treats 'event' as a single event; emit one legacy event per
    // removed user so each removal is logged/re-added individually.
    return leave.removedIds.map((id) => ({
      type: 'event',
      logMessageType: 'log:unsubscribe',
      threadID: leave.threadId,
      timestamp: leave.timestamp,
      senderID: leave.removedBy,
      logMessageData: {
        leftParticipantFbId: id,
        removed_by: leave.removedBy,
      },
    }));
  }

  // -- public compatibility surface -------------------------------------------

  const api = {
    /** Native panindigan-automate client, for code that wants the real thing. */
    raw: client,

    /**
     * Logs in and resolves once the realtime connection is up.
     * Resolves with the login result (`userId`).
     */
    async connect(): Promise<{ userId: string; restored: boolean }> {
      return client.login(appState as any);
    },

    /** Registers a handler; returns an unsubscribe function. */
    on(event: string, listener: (event: any) => void | Promise<void>): () => void {
      switch (event) {
        case 'message':
          return client.on('message', (e) => {
            void Promise.resolve(listener(toLegacyMessage(e))).catch((error) => {
              BotLogger.error('message event listener failed', error);
            });
          });
        case 'message_reply':
          return client.on('message_reply', (e) => {
            void (async () => {
              const replied = await enrichRepliedMessage(client, e);
              await listener({
                ...toLegacyMessage(e as unknown as MessageEvent),
                type: 'message_reply' as const,
                messageReply: replied
                  ? {
                      messageID: e.repliedToMessageId,
                      senderID: replied.senderId,
                      body: replied.body,
                      attachments: replied.attachments,
                      timestamp: replied.timestamp,
                    }
                  : { messageID: e.repliedToMessageId },
              });
            })().catch((error) => {
              BotLogger.error('message_reply event listener failed', error);
            });
          });
        case 'event': {
          const offJoin = client.on('participant_join', (e) => {
            void Promise.resolve(listener(toLegacyGroupEvent('join', e))).catch((error) => {
              BotLogger.error('participant_join listener failed', error);
            });
          });
          const offLeave = client.on('participant_leave', (e) => {
            for (const legacy of toLegacyGroupEvent('leave', e) as any[]) {
              void Promise.resolve(listener(legacy)).catch((error) => {
                BotLogger.error('participant_leave listener failed', error);
              });
            }
          });
          return () => {
            offJoin();
            offLeave();
          };
        }
        case 'appstate:update':
          BotLogger.warn(
            'appstate:update is not emitted by panindigan-automate — session cookies are refreshed and persisted to the automate storage directory instead',
          );
          return () => {};
        default:
          // Pass through native automate events (ready, error, warning, …).
          return (client as any).on(event, listener);
      }
    },

    once(event: string, listener: (event: any) => void | Promise<void>): () => void {
      const off = api.on(event, (e: any) => {
        off();
        return listener(e);
      });
      return off;
    },

    // -- namespaced surface used by main.ts ----------------------------------

    messages: {
      send: (opts: any) => sendInternal(opts?.threadId ?? opts?.threadID, opts),
      unsend: (messageId: string) => client.unsendMessage(String(messageId)),
    },

    users: {
      getSelf: async (): Promise<any> => {
        const me = await client.getMe();
        return { ...me, id: me.id };
      },
      getProfile: async (id: string | number): Promise<any> => {
        const user = await client.getUser(String(id));
        return { ...user, name: user.name ?? 'User' };
      },
    },

    threads: {
      addParticipants,
    },

    // -- legacy flat surface used by commands ---------------------------------

    /** Legacy: `api.sendMessage(message, threadId[, callback])`. */
    sendMessage: async (message: any, threadId?: unknown, callback?: (err: any, info?: any) => void): Promise<any> => {
      const opts = typeof message === 'string' ? { body: message } : message ?? {};
      const target = threadId ?? opts?.threadId ?? opts?.threadID;
      try {
        const result = await sendInternal(target, opts);
        if (typeof callback === 'function') callback(null, result);
        return result;
      } catch (error) {
        if (typeof callback === 'function') callback(error);
        throw error;
      }
    },

    unsendMessage: (messageId: string) => client.unsendMessage(String(messageId)),

    getThreadInfo: async (threadId: string | number): Promise<any> => {
      const thread = await client.getThread(String(threadId).trim());
      return toLegacyThread(thread);
    },

    getUserInfo,

    /** Legacy signature `(limit, timestamp, tags)`; `timestamp` is ignored (automate uses an opaque cursor). */
    getThreadList: async (limit: number = 20, _timestamp: unknown = null, tags?: string[]): Promise<any[]> => {
      const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(1, Number(limit)), 100) : 20;
      const result = await client.getThreadList({
        limit: safeLimit,
        ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
      });
      return result.threads.map(toLegacyThread);
    },

    /** Synchronous after login; returns `''` before login. */
    getCurrentUserID: (): string => client.getSession().userId,

    /** Legacy argument order: `(nickname, threadId, userId)`. */
    changeNickname: (nickname: string, threadId: string | number, userId: string | number): Promise<void> =>
      client.changeNickname(String(threadId).trim(), String(userId).trim(), String(nickname ?? '')),

    setTitle: (name: string, threadId: string | number): Promise<void> =>
      client.changeGroupName(String(threadId).trim(), String(name)),

    changeThreadColor: (color: string, threadId: string | number): Promise<void> =>
      client.changeGroupTheme(String(threadId).trim(), String(color)),

    changeThreadEmoji: (emoji: string, threadId: string | number): Promise<void> =>
      client.changeGroupEmoji(String(threadId).trim(), String(emoji)),

    changeAdminStatus: (threadId: string | number, userId: string | number, isAdmin: boolean): Promise<void> =>
      client.changeAdminStatus(String(threadId).trim(), String(userId).trim(), Boolean(isAdmin)),

    addUserToGroup: (userId: string | number, threadId: string | number): Promise<void> =>
      client.addParticipant(String(threadId).trim(), String(userId).trim()),

    removeUserFromGroup: (userId: string | number, threadId: string | number): Promise<void> =>
      client.removeParticipant(String(threadId).trim(), String(userId).trim()),
  };

  return api;
}

export type AutomationCompatClient = ReturnType<typeof createAutomationClient>;
