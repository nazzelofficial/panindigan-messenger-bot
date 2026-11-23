import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const STATUSES = new Set(["open", "resolved", "dismissed", "escalated"]);

export default createCommand(
  {
    name: "clearreports",
    description: "Resolve or dismiss a moderation report by its numeric id.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      const id = raw === undefined ? Number.NaN : Number(raw);
      if (!Number.isInteger(id) || id < 1)
        return { text: "Usage: !clearreports <reportId> [status]" };
      const status = context.args.positional[1]?.toLowerCase() ?? "resolved";
      if (!STATUSES.has(status)) {
        return { text: "Status must be one of: open, resolved, dismissed, escalated." };
      }
      const updated = await context.services.moderation.resolveReport(id, status);
      if (!updated) return { text: `No report with id ${id} exists; nothing was changed.` };
      return { text: `Report #${id} marked as ${status}.` };
    },
  },
  {
    aliases: [],
    usage: ["!clearreports <reportId> [open|resolved|dismissed|escalated]"],
    examples: ["!clearreports 12", "!clearreports 12 dismissed"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
