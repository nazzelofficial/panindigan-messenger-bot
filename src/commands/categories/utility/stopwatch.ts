import { formatDuration } from "../../../utils/time.js";
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

interface StopwatchState {
  startedAt: number | null;
  accumulatedMs: number;
}

function elapsed(state: StopwatchState): number {
  return state.accumulatedMs + (state.startedAt === null ? 0 : Date.now() - state.startedAt);
}

export default createCommand(
  {
    name: "stopwatch",
    description: "Start, read, stop or reset a personal stopwatch scoped to this thread.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = `stopwatch:${context.senderId}:${context.threadId}`;
      const action = (context.args.positional[0] ?? "show").toLowerCase();
      if (action === "reset") {
        await cache.delete(key);
        return { text: "Your stopwatch has been reset." };
      }
      const state = await cache.get<StopwatchState>(key);
      if (action === "start") {
        if (state?.startedAt !== null && state?.startedAt !== undefined) {
          return { text: `Already running. Elapsed: ${formatDuration(elapsed(state))}.` };
        }
        const next: StopwatchState = {
          startedAt: Date.now(),
          accumulatedMs: state?.accumulatedMs ?? 0,
        };
        await cache.set(key, next, 24 * 3600);
        return { text: "Stopwatch started." };
      }
      if (action === "stop") {
        if (!state || state.startedAt === null) return { text: "Your stopwatch is not running." };
        const stopped: StopwatchState = { startedAt: null, accumulatedMs: elapsed(state) };
        await cache.set(key, stopped, 24 * 3600);
        return {
          text: `Stopped at ${stopped.accumulatedMs} ms (${formatDuration(stopped.accumulatedMs)}).`,
        };
      }
      if (!state) return { text: "No stopwatch yet. Use !stopwatch start." };
      const status = state.startedAt === null ? "stopped" : "running";
      return {
        text: `Stopwatch (${status}): ${elapsed(state)} ms — ${formatDuration(elapsed(state))}.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!stopwatch start|stop|reset", "!stopwatch"],
    examples: ["!stopwatch start", "!stopwatch", "!stopwatch stop"],
    permission: "public",
    cooldownMs: 300,
  },
);
