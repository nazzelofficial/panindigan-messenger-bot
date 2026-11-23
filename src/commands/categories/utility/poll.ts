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

interface PollChoice {
  readonly label: string;
  readonly voters: string[];
}

interface PollState {
  readonly question: string;
  readonly options: PollChoice[];
  readonly creatorId: string;
  readonly createdAt: number;
}

function keyFor(context: CommandContext): string {
  return `poll:${context.threadId}`;
}

export default createCommand(
  {
    name: "poll",
    description: "Create a temporary multiple-choice poll in this thread, valid for seven days.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = keyFor(context);
      const body = context.args.raw.replace(/^\S+\s*/, "").trim();
      if (body.toLowerCase() === "clear") {
        const existing = await cache.get<PollState>(key);
        if (existing && existing.creatorId !== context.senderId) {
          return { text: "Only the poll creator can clear it." };
        }
        await cache.delete(key);
        return { text: "Any active poll in this thread has been cleared." };
      }
      const parts = body
        .split("|")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const question = parts[0];
      const labels = parts.slice(1);
      if (!question || labels.length < 2) {
        return {
          text: "Usage: !poll Question | Option A | Option B | Option C (two to ten options).",
        };
      }
      if (labels.length > 10) return { text: "A poll can have at most ten options." };
      const state: PollState = {
        question: question.slice(0, 500),
        options: labels.map((label) => ({ label: label.slice(0, 200), voters: [] })),
        creatorId: context.senderId,
        createdAt: Date.now(),
      };
      await cache.set(key, state, 7 * 24 * 3600);
      const lines = [`Poll: ${state.question}`];
      state.options.forEach((option, index) =>
        lines.push(`${index + 1}. ${option.label} — 0 votes`),
      );
      lines.push("Vote with !vote <number>.");
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!poll Question | Option A | Option B", "!poll clear"],
    examples: ["!poll Best day? | Friday | Saturday | Sunday", "!poll clear"],
    permission: "public",
    cooldownMs: 1000,
  },
);
