import {
  DEFAULT_TIMEZONE,
  formatDateTime,
  formatDuration,
  zonedDateTimeToEpoch,
} from "../../../utils/time.js";
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

interface CountdownState {
  readonly targetEpoch: number;
  readonly label: string;
}

export default createCommand(
  {
    name: "countdown",
    description: "Store or check a personal countdown to a Manila-local date and time.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = `countdown:${context.senderId}:${context.threadId}`;
      const args = context.args.positional;
      if (args[0]?.toLowerCase() === "clear") {
        await cache.delete(key);
        return { text: "Your countdown in this thread has been cleared." };
      }
      const first = args[0];
      if (!first) {
        const state = await cache.get<CountdownState>(key);
        if (!state)
          return { text: "No countdown stored here. Use !countdown YYYY-MM-DD HH:mm to set one." };
        const remaining = state.targetEpoch - Date.now();
        if (remaining <= 0)
          return { text: `${state.label || "Countdown"}: the target time has passed.` };
        return {
          text: `${state.label || "Countdown"} — ${formatDuration(remaining)} remaining (${formatDateTime(state.targetEpoch, DEFAULT_TIMEZONE)}).`,
        };
      }
      const timeText = args[1] ?? "00:00";
      const label = args.slice(2).join(" ") || "Countdown";
      try {
        const targetEpoch = zonedDateTimeToEpoch(first, timeText, DEFAULT_TIMEZONE);
        if (targetEpoch <= Date.now())
          return { text: "That target is in the past; choose a future date and time." };
        const state: CountdownState = { targetEpoch, label: label.slice(0, 200) };
        const lifetime = Math.max(3600, Math.ceil((targetEpoch - Date.now()) / 1000) + 86400);
        await cache.set(key, state, lifetime);
        return {
          text: `Countdown set for ${formatDateTime(targetEpoch, DEFAULT_TIMEZONE)}: ${formatDuration(targetEpoch - Date.now())} remaining.`,
        };
      } catch (error) {
        return {
          text: `Invalid countdown: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!countdown YYYY-MM-DD HH:mm [label]", "!countdown", "!countdown clear"],
    examples: ["!countdown 2027-01-01 00:00 New Year", "!countdown"],
    permission: "public",
    cooldownMs: 500,
  },
);
