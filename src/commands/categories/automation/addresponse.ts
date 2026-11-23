import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const MATCH_MODES = new Set(["exact", "contains", "prefix"]);

export default createCommand(
  {
    name: "addresponse",
    description: "Add or update an automatic text response for a trigger phrase in this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const trigger = context.args.positional[0]?.trim();
      const response = context.args.positional.slice(1).join(" ").trim();
      if (!trigger || !response) {
        return { text: "Usage: !addresponse <trigger> <response> [--mode=exact|contains|prefix]" };
      }
      const requested = context.args.named["mode"]?.toLowerCase();
      if (requested !== undefined && !MATCH_MODES.has(requested)) {
        return { text: "Invalid --mode. Choose exact, contains, or prefix." };
      }
      const matchMode = requested ?? "exact";
      await context.services.automation.addResponse(
        context.threadId,
        trigger,
        response,
        context.senderId,
        matchMode,
      );
      await context.services.automation.recordRun(context.threadId, "addresponse", {
        trigger,
        matchMode,
      });
      return { text: `Saved auto-response "${trigger}" → "${response}" (${matchMode} match).` };
    },
  },
  {
    aliases: [],
    usage: ["!addresponse <trigger> <response> [--mode=exact|contains|prefix]"],
    examples: [
      "!addresponse hello Welcome to the group!",
      "!addresponse help See !commands --mode=contains",
    ],
    permission: "admin",
    cooldownMs: 2000,
  },
);
