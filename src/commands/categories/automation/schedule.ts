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
    name: "schedule",
    description:
      "Queue a persistent reminder job in this thread for a future Manila-local date and time.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const date = context.args.positional[0];
      const time = context.args.positional[1];
      const note = context.args.positional.slice(2).join(" ").trim();
      if (!date || !time || !note) {
        return { text: "Usage: !schedule <YYYY-MM-DD> <HH:mm> <reminder>" };
      }
      let due: number;
      try {
        due = zonedDateTimeToEpoch(date, time, "Asia/Manila");
      } catch (error) {
        return { text: `Invalid date or time: ${describe(error)}` };
      }
      if (due <= Date.now())
        return { text: "The reminder time must be in the future (Asia/Manila)." };
      const attempts = context.args.named["attempts"];
      const maximumAttempts = attempts === undefined ? undefined : Number(attempts);
      if (
        maximumAttempts !== undefined &&
        (!Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 20)
      ) {
        return { text: "--attempts must be a whole number between 1 and 20." };
      }
      const job = await context.services.scheduler.schedule({
        kind: "reminder",
        payload: { threadId: context.threadId, note },
        dueAt: new Date(due),
        timezone: "Asia/Manila",
        ...(maximumAttempts === undefined ? {} : { maximumAttempts }),
        createdBy: context.senderId,
      });
      await context.services.automation.recordRun(context.threadId, "schedule", { due, note });
      const id = field(job, "id");
      return {
        text: `Reminder${id === undefined ? "" : ` #${String(id)}`} queued for ${formatDateTime(due)} (Asia/Manila): ${note}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!schedule <YYYY-MM-DD> <HH:mm> <reminder> [--attempts=3]"],
    examples: ["!schedule 2026-11-24 08:00 Team standup in 10 minutes"],
    permission: "admin",
    cooldownMs: 2500,
  },
);
