import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDateTime, zonedDateTimeToEpoch } from "../../../utils/time.js";

function field(row: unknown, key: string): unknown {
  if (typeof row !== "object" || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "scheduledmessage",
    description:
      "Create a persistent scheduled message job for this thread at a Manila local time.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const date = context.args.positional[0];
      const time = context.args.positional[1];
      const body = context.args.positional.slice(2).join(" ").trim();
      if (!date || !time || !body) {
        return { text: "Usage: !scheduledmessage <YYYY-MM-DD> <HH:mm> <message>" };
      }
      let due: number;
      try {
        due = zonedDateTimeToEpoch(date, time, "Asia/Manila");
      } catch (error) {
        return { text: `Invalid date or time: ${describe(error)}` };
      }
      if (due <= Date.now())
        return { text: "The scheduled time must be in the future (Asia/Manila)." };
      const job = await context.services.scheduler.schedule({
        kind: "message",
        payload: { threadId: context.threadId, body },
        dueAt: new Date(due),
        timezone: "Asia/Manila",
        createdBy: context.senderId,
      });
      await context.services.automation.recordRun(context.threadId, "scheduledmessage", {
        due,
        body,
      });
      const id = field(job, "id");
      return {
        text: `Scheduled message${id === undefined ? "" : ` #${String(id)}`} for ${formatDateTime(due)} (Asia/Manila): ${body}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!scheduledmessage <YYYY-MM-DD> <HH:mm> <message>"],
    examples: ["!scheduledmessage 2026-12-25 09:00 Merry Christmas everyone!"],
    permission: "admin",
    cooldownMs: 2500,
  },
);
