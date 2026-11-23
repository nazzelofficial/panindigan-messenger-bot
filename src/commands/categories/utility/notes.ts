import { truncate } from "../../../utils/text.js";
import { formatDateTime } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface TemporaryCache {
  get<T>(name: string): Promise<T | undefined>;
  set(name: string, value: unknown, lifetimeSeconds: number): Promise<void>;
  delete(name: string): Promise<void>;
}

const SHARED_STORE_KEY = Symbol.for("panindigan.temporaryCache");
const globalStore = globalThis as unknown as Record<symbol, Map<string, unknown> | undefined>;
const inProcessStore: Map<string, unknown> =
  globalStore[SHARED_STORE_KEY] ?? (globalStore[SHARED_STORE_KEY] = new Map<string, unknown>());

function temporaryCache(context: CommandContext): TemporaryCache {
  const cache = context.services.cache;
  if (cache) return cache;
  // Redis-backed cache is preferred; this in-process fallback is scoped by key and lost on restart.
  return {
    async get<T>(name: string): Promise<T | undefined> {
      return inProcessStore.get(name) as T | undefined;
    },
    async set(name: string, value: unknown): Promise<void> {
      inProcessStore.set(name, value);
    },
    async delete(name: string): Promise<void> {
      inProcessStore.delete(name);
    },
  };
}

interface NoteEntry {
  readonly text: string;
  readonly at: number;
}

const MAX_NOTES = 20;

export default createCommand(
  {
    name: "notes",
    description: "Keep a small personal notepad scoped to you and this thread.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = `notes:${context.senderId}:${context.threadId}`;
      const body = context.args.raw.replace(/^\S+\s*/, "").trim();
      if (body.toLowerCase() === "clear") {
        await cache.delete(key);
        return { text: "Your notes in this thread have been cleared." };
      }
      const notes = (await cache.get<readonly NoteEntry[]>(key)) ?? [];
      if (!body) {
        if (notes.length === 0)
          return { text: "Your notepad is empty. Add one with !notes <text>." };
        const lines = notes.map(
          (note, index) => `${index + 1}. ${note.text} — ${formatDateTime(note.at)}`,
        );
        lines.push(`Stored: ${notes.length}/${MAX_NOTES} notes.`);
        return { text: lines.join("\n") };
      }
      const next = [...notes, { text: truncate(body, 500), at: Date.now() }].slice(-MAX_NOTES);
      await cache.set(key, next, 30 * 24 * 3600);
      return {
        text: `Note saved (${next.length}/${MAX_NOTES}): ${next[next.length - 1]?.text ?? ""}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!notes", "!notes TEXT", "!notes clear"],
    examples: ["!notes Buy coffee", "!notes", "!notes clear"],
    permission: "public",
    cooldownMs: 300,
  },
);
