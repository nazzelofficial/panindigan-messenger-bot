import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "announcements",
    description: "Show developer announcement history and delivery status.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const svc = context.services.announcements;
      const id = context.args.positional[0];
      if (id) return { text: svc.formatRecord((await svc.info(id)).record) };
      const rows = await svc.list(20);
      return {
        text: rows.length
          ? "📢 ANNOUNCEMENTS\n\n" +
            rows
              .map(
                (r) =>
                  r.id +
                  " | " +
                  r.status +
                  " | sent " +
                  r.successful_deliveries +
                  "/" +
                  r.total_targets +
                  " | " +
                  r.title,
              )
              .join("\n")
          : "No announcements have been created.",
      };
    },
  },
  {
    aliases: ["announcement"],
    usage: ["!announcements"],
    examples: ["!announcements"],
    permission: "owner",
    cooldownMs: 1200,
    maintenanceSafe: true,
    module: "announcements",
  },
);
