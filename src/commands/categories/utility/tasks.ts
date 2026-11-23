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
    name: "tasks",
    description: "List task details or mark a shared to-do item complete or incomplete.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const cache = temporaryCache(context);
      const key = todoKey(context);
      const state = await cache.get<TodoState>(key);
      if (!state || state.items.length === 0)
        return { text: "No tasks are stored in this thread yet." };
      const action = context.args.positional[0]?.toLowerCase();
      if (action === "done" || action === "undone") {
        const id = Number(context.args.positional[1]);
        if (!Number.isInteger(id)) return { text: `Provide a task number: !tasks ${action} 2` };
        const target = state.items.find((item) => item.id === id);
        if (!target) return { text: `No task with number ${id} exists.` };
        const items = state.items.map((item) =>
          item.id === id ? { ...item, done: action === "done" } : { ...item },
        );
        await cache.set(key, { items, nextId: state.nextId }, 30 * 24 * 3600);
        return { text: `Task #${id} marked as ${action}.` };
      }
      const lines = state.items.map(
        (item) =>
          `#${item.id} [${item.done ? "DONE" : "OPEN"}] ${item.text} — added by ${item.addedBy}`,
      );
      return {
        text: `Tasks in this thread:\n${lines.join("\n")}\nUse !tasks done NUMBER to complete one.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!tasks", "!tasks done|undone TASK_NUMBER"],
    examples: ["!tasks", "!tasks done 2", "!tasks undone 2"],
    permission: "public",
    cooldownMs: 300,
  },
);
