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

interface TodoItem {
  readonly id: number;
  readonly text: string;
  readonly addedBy: string;
  readonly done: boolean;
}

interface TodoState {
  items: TodoItem[];
  nextId: number;
}

function todoKey(context: CommandContext): string {
  return `todo:${context.threadId}`;
}

export default createCommand(
  {
    name: "removetask",
    description: "Delete a numbered task from this thread's shared temporary to-do list.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const argument = context.args.positional[0];
      if (!argument) return { text: "Provide a task number, for example: !removetask 2" };
      const id = Number(argument);
      if (!Number.isInteger(id) || id <= 0)
        return { text: "Task numbers must be positive whole numbers." };
      const cache = temporaryCache(context);
      const key = todoKey(context);
      const state = await cache.get<TodoState>(key);
      if (!state) return { text: "The to-do list is empty; nothing to remove." };
      const removed = state.items.find((item) => item.id === id);
      if (!removed) return { text: `No task with number ${id} exists in this list.` };
      const next: TodoState = {
        items: state.items.filter((item) => item.id !== id),
        nextId: state.nextId,
      };
      await cache.set(key, next, 30 * 24 * 3600);
      return { text: `Removed task #${id}: ${removed.text}\n${next.items.length} item(s) remain.` };
    },
  },
  {
    aliases: [],
    usage: ["!removetask TASK_NUMBER"],
    examples: ["!removetask 1", "!removetask 3"],
    permission: "public",
    cooldownMs: 300,
  },
);
