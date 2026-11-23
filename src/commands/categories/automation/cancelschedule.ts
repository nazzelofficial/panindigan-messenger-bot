import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function field(row: unknown, key: string): unknown {
  if (typeof row !== "object" || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

export default createCommand(
  {
    name: "cancelschedule",
    description: "Cancel a scheduled job by id after confirming that the job exists.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0]?.trim();
      if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        return { text: "Usage: !cancelschedule <jobId>" };
      }
      const jobs: readonly unknown[] = await context.services.scheduler.list(500);
      const exists = jobs.some((job) => String(field(job, "id") ?? "") === id);
      if (!exists) return { text: `No scheduled job with id ${id} was found.` };
      const result = await context.services.scheduler.cancel(id);
      if (result === false)
        return { text: `The scheduler could not cancel job ${id}. It was left unchanged.` };
      await context.services.automation.recordRun(context.threadId, "cancelschedule", { id });
      return { text: `Cancelled scheduled job ${id}.` };
    },
  },
  {
    aliases: [],
    usage: ["!cancelschedule <jobId>"],
    examples: ["!cancelschedule 42"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
