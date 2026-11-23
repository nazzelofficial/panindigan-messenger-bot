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

interface TimerState {
  readonly endsAt: number;
  readonly label: string;
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
    name: "timer",
    description: "Set or inspect a personal countdown timer that expires at a real epoch deadline.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = `timer:${context.senderId}:${context.threadId}`;
      const args = context.args.positional;
      if (args[0]?.toLowerCase() === "clear") {
        await cache.delete(key);
        return { text: "Your timer in this thread has been cleared." };
      }
      const durationText = args[0];
      if (!durationText) {
        const state = await cache.get<TimerState>(key);
        if (!state) return { text: "No active timer. Use !timer 5m [label]." };
        const remaining = state.endsAt - Date.now();
        if (remaining <= 0)
          return { text: `${state.label}: timer finished at ${formatDateTime(state.endsAt)}.` };
        return {
          text: `${state.label}: ${formatDuration(remaining)} remaining (ends ${formatDateTime(state.endsAt)}).`,
        };
      }
      const durationMs = parseDuration(durationText);
      if (durationMs === undefined)
        return { text: "Use a duration like 30s, 5m, 2h, 1d or 500ms." };
      if (durationMs > 30 * 24 * 3600 * 1000) return { text: "Timers cannot exceed 30 days." };
      const state: TimerState = {
        endsAt: Date.now() + durationMs,
        label: args.slice(1).join(" ") || "Timer",
      };
      await cache.set(key, state, Math.ceil(durationMs / 1000) + 3600);
      return {
        text: `Timer set: ${state.label} expires at ${formatDateTime(state.endsAt)} (${formatDuration(durationMs)} from now).`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!timer DURATION [label]", "!timer", "!timer clear"],
    examples: ["!timer 5m Coffee break", "!timer", "!timer clear"],
    permission: "public",
    cooldownMs: 300,
  },
);
