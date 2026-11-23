import { formatDateTime, formatDuration } from "../../../utils/time.js";
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

interface ReminderState {
  readonly message: string;
  readonly dueAt: number;
}

function parseDuration(text: string): number | undefined {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(text.trim());
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const factors: Readonly<Record<string, number>> = {
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };
  const factor = unit === undefined ? undefined : factors[unit];
  if (!Number.isFinite(amount) || amount <= 0 || factor === undefined) return undefined;
  return amount * factor;
}

export default createCommand(
  {
    name: "reminder",
    description: "Store a personal reminder with a real due time; check it with !reminder.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = `reminder:${context.senderId}:${context.threadId}`;
      const args = context.args.positional;
      if (args[0]?.toLowerCase() === "clear") {
        await cache.delete(key);
        return { text: "Your reminder in this thread has been cleared." };
      }
      const durationText = args[0];
      if (!durationText) {
        const state = await cache.get<ReminderState>(key);
        if (!state)
          return { text: "You have no stored reminder here. Use !reminder 10m Buy milk." };
        const remaining = state.dueAt - Date.now();
        if (remaining <= 0)
          return { text: `Reminder (due ${formatDateTime(state.dueAt)}): ${state.message}` };
        return {
          text: `Reminder: ${state.message}\nDue in ${formatDuration(remaining)} at ${formatDateTime(state.dueAt)}.`,
        };
      }
      const durationMs = parseDuration(durationText);
      const message = args.slice(1).join(" ").trim();
      if (durationMs === undefined || !message) {
        return { text: "Usage: !reminder DURATION MESSAGE — e.g. !reminder 10m Buy milk" };
      }
      if (durationMs > 30 * 24 * 3600 * 1000) return { text: "Reminders cannot exceed 30 days." };
      const state: ReminderState = {
        message: message.slice(0, 500),
        dueAt: Date.now() + durationMs,
      };
      await cache.set(key, state, Math.ceil(durationMs / 1000) + 86400);
      return {
        text: `Reminder saved: "${state.message}"\nDue ${formatDateTime(state.dueAt)}. This is checked on demand when you run !reminder; no proactive ping is scheduled here.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!reminder DURATION MESSAGE", "!reminder", "!reminder clear"],
    examples: ["!reminder 10m Buy milk", "!reminder", "!reminder clear"],
    permission: "public",
    cooldownMs: 300,
  },
);
