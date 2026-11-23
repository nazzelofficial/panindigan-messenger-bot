import { truncate } from "../../../utils/text.js";
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

const MAX_ITEMS = 50;

function todoKey(context: CommandContext): string {
  return `todo:${context.threadId}`;
}

export default createCommand(
  {
    name: "addtask",
    description: "Append a task to this thread's shared temporary to-do list.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = context.args.raw.replace(/^\S+\s*/, "").trim();
      if (!text)
        return { text: "Provide a task description, for example: !addtask Review pull request" };
      const cache = temporaryCache(context);
      const key = todoKey(context);
      const state = (await cache.get<TodoState>(key)) ?? { items: [], nextId: 1 };
      if (state.items.length >= MAX_ITEMS)
        return { text: `This list is full (${MAX_ITEMS} items). Remove one first.` };
      const item: TodoItem = {
        id: state.nextId,
        text: truncate(text, 300),
        addedBy: context.senderId,
        done: false,
      };
      const next: TodoState = { items: [...state.items, item], nextId: state.nextId + 1 };
      await cache.set(key, next, 30 * 24 * 3600);
      return {
        text: `Added task #${item.id}: ${item.text}\nList now has ${next.items.length} item(s).`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!addtask TASK_TEXT"],
    examples: ["!addtask Review pull request", "!addtask Call the client"],
    permission: "public",
    cooldownMs: 300,
  },
);
