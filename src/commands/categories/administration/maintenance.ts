import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDateTime } from "../../../utils/time.js";

export default createCommand(
  {
    name: "maintenance",
    description: "Manage global maintenance: status, schedule, notices and lifecycle.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const action = (context.args.positional[0] ?? "status").toLowerCase();
      const svc = context.services.maintenance;
      const owner = context.services.permissions.isOwner(context.senderId);
      const restricted = [
        "on",
        "off",
        "schedule",
        "cancel",
        "reschedule",
        "edit",
        "notice",
        "notify",
        "config",
        "start",
        "finish",
      ];
      if (restricted.includes(action) && !owner)
        return { text: "Only the bot owner can change maintenance state." };
      const args = context.args.positional.slice(1);
      switch (action) {
        case "status": {
          const s = await svc.currentStatus();
          const lines = ["🛠️ MAINTENANCE STATUS", "", "Status: " + s.status];
          if (s.record)
            lines.push(
              "Title: " + s.record.title,
              "Reason: " + s.record.reason,
              "Start: " +
                formatDateTime(s.record.starts_at.getTime(), context.config.maintenance.timezone),
              "End: " +
                formatDateTime(s.record.ends_at.getTime(), context.config.maintenance.timezone),
              "ID: " + s.record.id,
            );
          return { text: lines.join("\n") };
        }
        case "on": {
          const title = args.join(" ") || "Unscheduled maintenance";
          const record = await svc.activateNow(context.senderId, title, "Manual activation", "");
          return { text: "Global maintenance is now ACTIVE. ID: " + record.id };
        }
        case "off": {
          await svc.deactivateNow(context.senderId);
          return { text: "Global maintenance has ended. Commands are operational again." };
        }
        case "schedule":
        case "reschedule": {
          if (args.length < 5)
            return {
              text: "Usage: !maintenance schedule YYYY-MM-DD HH:mm YYYY-MM-DD HH:mm Title [reason]",
            };
          const input = {
            title: args.slice(4).join(" "),
            reason: context.args.named["reason"] ?? "",
            startDate: args[0]!,
            startTime: args[1]!,
            endDate: args[2]!,
            endTime: args[3]!,
            noticeMessage: context.args.named["notice"] ?? "",
            createdBy: context.senderId,
          };
          if (action === "schedule") {
            const record = await svc.createSchedule(input);
            return {
              text:
                "Maintenance scheduled. ID: " +
                record.id +
                "\nStart: " +
                formatDateTime(record.starts_at.getTime(), context.config.maintenance.timezone),
            };
          }
          const id = args[0];
          if (!id)
            return {
              text: "Usage: !maintenance reschedule <id> YYYY-MM-DD HH:mm YYYY-MM-DD HH:mm Title",
            };
          await svc.reschedule(id, {
            ...input,
            startDate: args[1]!,
            startTime: args[2]!,
            endDate: args[3]!,
            endTime: args[4]!,
            title: args.slice(5).join(" "),
          });
          return { text: "Maintenance " + id + " was rescheduled." };
        }
        case "list": {
          const rows = await svc.list(15);
          return {
            text: rows.length
              ? rows
                  .map(
                    (r) =>
                      r.id +
                      " | " +
                      r.status +
                      " | " +
                      r.title +
                      " | " +
                      formatDateTime(r.starts_at.getTime(), context.config.maintenance.timezone),
                  )
                  .join("\n")
              : "No maintenance records.",
          };
        }
        case "info":
        case "history": {
          if (action === "history") {
            const rows = await svc.history(args[0], 20);
            return {
              text: rows.length
                ? JSON.stringify(rows, null, 2).slice(0, 1800)
                : "No maintenance history.",
            };
          }
          if (!args[0]) return { text: "Usage: !maintenance info <id>" };
          const info = await svc.info(args[0]);
          return {
            text: JSON.stringify(
              { record: info.record, notifications: info.notifications.slice(0, 10) },
              null,
              2,
            ).slice(0, 1800),
          };
        }
        case "cancel": {
          if (!args[0]) return { text: "Usage: !maintenance cancel <id>" };
          await svc.cancel(args[0], context.senderId);
          return { text: "Maintenance " + args[0] + " was cancelled." };
        }
        case "edit": {
          if (args.length < 2)
            return { text: "Usage: !maintenance edit <id> title=<new title> reason=<new reason>" };
          const patch: Record<string, string> = {};
          for (const token of args.slice(1)) {
            const i = token.indexOf("=");
            if (i > 0) patch[token.slice(0, i)] = token.slice(i + 1);
          }
          await svc.edit(args[0]!, patch);
          return { text: "Maintenance " + args[0] + " was updated." };
        }
        case "notice": {
          const message = context.args.raw.split(/\s+/).slice(2).join(" ");
          if (!message) return { text: "Usage: !maintenance notice <message>" };
          const result = await svc.sendNotice(message, context.senderId);
          return {
            text: "Notice delivered: " + result.sent + " groups, " + result.failed + " failed.",
          };
        }
        case "notify": {
          const id = args[0];
          if (!id) return { text: "Usage: !maintenance notify <id>" };
          await svc.deliverScheduledNotice(id, Number(args[1] ?? 0));
          return { text: "Notices for " + id + " were dispatched." };
        }
        case "config": {
          return { text: JSON.stringify(svc.configuration(), null, 2) };
        }
        case "start":
        case "finish": {
          const id = args[0] ?? (await svc.currentStatus()).record?.id;
          if (!id) return { text: "No maintenance record is available." };
          if (action === "start") await svc.start(id, context.senderId);
          else await svc.finish(id, context.senderId);
          return {
            text:
              "Maintenance " +
              id +
              " is now " +
              (action === "start" ? "ACTIVE" : "COMPLETED") +
              ".",
          };
        }
        default:
          return {
            text: "Unknown maintenance subcommand. Use status, on, off, schedule, list, info, cancel, reschedule, edit, notice, notify, history or config.",
          };
      }
    },
  },
  {
    aliases: [],
    usage: ["!maintenance <subcommand> [arguments]"],
    examples: [
      "!maintenance status",
      "!maintenance schedule 2026-12-01 22:00 2026-12-02 01:00 Database upgrade",
      "!maintenance on",
    ],
    permission: "admin",
    cooldownMs: 1200,
    maintenanceSafe: true,
    module: "maintenance",
  },
);
