import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "developer",
    description: "Developer console for global announcements and diagnostics.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const action = (context.args.positional[0] ?? "status").toLowerCase();
      const svc = context.services.announcements;
      const args = context.args.positional.slice(1);
      switch (action) {
        case "status": {
          const s = await svc.status();
          return {
            text:
              "📣 DEVELOPER STATUS\n\nTotal: " +
              s.total +
              "\nCompleted: " +
              s.completed +
              "\nPartial: " +
              s.partial +
              "\nScheduled: " +
              s.scheduled,
          };
        }
        case "message":
        case "announce": {
          const body = context.args.raw.split(/\s+/).slice(2).join(" ");
          if (!body) return { text: "Usage: !developer message <text>" };
          const result = await svc.prepare("Developer message", body, context.senderId);
          return { text: result.preview + "\nAnnouncement ID: " + result.id };
        }
        case "schedule": {
          if (args.length < 3)
            return { text: "Usage: !developer schedule YYYY-MM-DD HH:mm <text>" };
          const date = args[0]!;
          const time = args[1]!;
          const record = await svc.schedule({
            date,
            time,
            title: "Scheduled developer message",
            body: args.slice(2).join(" "),
            createdBy: context.senderId,
          });
          return { text: "Scheduled announcement " + record.id + "." };
        }
        case "history": {
          const rows = await svc.list(20);
          return {
            text: rows.length
              ? rows.map((r) => r.id + " | " + r.status + " | " + r.title).join("\n")
              : "No announcements yet.",
          };
        }
        case "info": {
          if (!args[0]) return { text: "Usage: !developer info <id>" };
          return { text: svc.formatRecord((await svc.info(args[0])).record) };
        }
        case "cancel": {
          if (!args[0]) return { text: "Usage: !developer cancel <id>" };
          await svc.cancel(args[0]);
          return { text: "Announcement " + args[0] + " cancelled." };
        }
        default:
          return {
            text: "Unknown developer subcommand. Use status, message, announce, schedule, history, info or cancel.",
          };
      }
    },
  },
  {
    aliases: [],
    usage: ["!developer <subcommand>"],
    examples: [
      "!developer status",
      "!developer message Hello",
      "!developer schedule 2026-12-01 20:00 Release",
    ],
    permission: "owner",
    cooldownMs: 1200,
    maintenanceSafe: true,
    module: "announcements",
  },
);
