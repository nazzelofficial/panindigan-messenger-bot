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

export default createCommand(
  {
    name: "vote",
    description: "Cast or change your vote in this thread's active temporary poll.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = `poll:${context.threadId}`;
      const state = await cache.get<PollState>(key);
      if (!state) return { text: "There is no active poll in this thread. Create one with !poll." };
      const choiceText = context.args.positional[0];
      if (!choiceText) {
        const lines = [`Poll: ${state.question}`];
        state.options.forEach((option, index) =>
          lines.push(`${index + 1}. ${option.label} — ${option.voters.length} votes`),
        );
        return { text: `${lines.join("\n")}\nCast a vote with !vote <number>.` };
      }
      const number = Number(choiceText);
      if (!Number.isInteger(number) || number < 1 || number > state.options.length) {
        return { text: `Choose an option number from 1 to ${state.options.length}.` };
      }
      const selected = number - 1;
      const options = state.options.map((option, index) => ({
        label: option.label,
        voters:
          index === selected
            ? [...option.voters.filter((id) => id !== context.senderId), context.senderId]
            : option.voters.filter((id) => id !== context.senderId),
      }));
      const remainingSeconds = Math.max(
        3600,
        7 * 24 * 3600 - Math.floor((Date.now() - state.createdAt) / 1000),
      );
      await cache.set(key, { ...state, options }, remainingSeconds);
      const lines = [
        `Vote recorded for: ${options[selected]?.label ?? "unknown"}`,
        `Poll: ${state.question}`,
      ];
      options.forEach((option, index) => {
        const mine = option.voters.includes(context.senderId) ? " (you)" : "";
        lines.push(`${index + 1}. ${option.label} — ${option.voters.length} votes${mine}`);
      });
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!vote OPTION_NUMBER"],
    examples: ["!vote 2", "!vote"],
    permission: "public",
    cooldownMs: 500,
  },
);
