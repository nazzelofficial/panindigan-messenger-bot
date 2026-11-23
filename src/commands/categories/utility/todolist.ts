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
    name: "todolist",
    description: "Display this thread's shared temporary to-do list with item numbers.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const state = await temporaryCache(context).get<TodoState>(todoKey(context));
      if (!state || state.items.length === 0) {
        return { text: "The to-do list is empty. Add an item with !addtask <text>." };
      }
      const done = state.items.filter((item) => item.done).length;
      const lines = state.items.map(
        (item) => `${item.done ? "[x]" : "[ ]"} ${item.id}. ${item.text} (by ${item.addedBy})`,
      );
      lines.push(`Progress: ${done}/${state.items.length} done.`);
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!todolist"],
    examples: ["!todolist"],
    permission: "public",
    cooldownMs: 300,
  },
);
