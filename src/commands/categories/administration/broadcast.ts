import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "broadcast",
    description: "Preview and send a tracked message to every eligible group.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const svc = context.services.announcements;
      const mode = (context.args.positional[0] ?? "").toLowerCase();
      if (mode === "confirm") {
        const id = context.args.positional[1];
        if (!id) return { text: "Usage: !broadcast confirm <announcement id>" };
        const result = await svc.confirm(id, context.senderId);
        return {
          text:
            "📊 DELIVERY SUMMARY\nTargets: " +
            result.targets +
            "\nSent: " +
            result.sent +
            "\nFailed: " +
            result.failed +
            "\nSkipped duplicates: " +
            result.skipped +
            "\n\nFailed groups are reported honestly; no success is claimed for them.",
        };
      }
      const body = (
        mode === "preview" ? context.args.positional.slice(1) : context.args.positional
      ).join(" ");
      if (!body) return { text: "Usage: !broadcast <message> or !broadcast preview <message>" };
      const result = await svc.prepare("Developer broadcast", body, context.senderId);
      return { text: result.preview + "\nAnnouncement ID: " + result.id };
    },
  },
  {
    aliases: [],
    usage: ["!broadcast [preview|confirm] <message|id>"],
    examples: [
      "!broadcast Hello everyone",
      "!broadcast preview Hello",
      "!broadcast confirm ann_123",
    ],
    permission: "owner",
    cooldownMs: 2000,
    maintenanceSafe: true,
    module: "announcements",
  },
);
