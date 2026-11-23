import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function field(row: unknown, key: string): unknown {
  if (typeof row !== "object" || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

function show(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  return JSON.stringify(value) ?? fallback;
}

export default createCommand(
  {
    name: "autoresponder",
    description: "Show the auto-responder overview and stored automation settings for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const [settings, responses, triggers] = await Promise.all([
        context.services.automation.settings(context.threadId),
        context.services.automation.responses(context.threadId),
        context.services.automation.triggers(context.threadId),
      ]);
      const welcome = field(settings, "welcome_message");
      const goodbye = field(settings, "goodbye_message");
      const emoji = field(settings, "auto_react_emoji");
      const autoDelete = field(settings, "auto_delete_seconds");
      return {
        text: [
          `Auto-responder overview for ${context.threadName ?? context.threadId}`,
          `Auto responses: ${responses.length}`,
          `Keyword triggers: ${triggers.length}`,
          `Welcome message: ${show(welcome, "not set")}`,
          `Goodbye message: ${show(goodbye, "not set")}`,
          `Auto-react emoji: ${show(emoji, "not set")}`,
          `Auto-delete: ${show(autoDelete, "off")}`,
          `Announcements: ${show(field(settings, "announcement_enabled"), "off")}`,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!autoresponder"],
    examples: ["!autoresponder"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
