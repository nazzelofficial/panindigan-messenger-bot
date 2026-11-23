import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { readFileSync } from "node:fs";
import path from "node:path";

export default createCommand(
  {
    name: "changelog",
    description: "Show the most recent changelog entries.",
    category: "administration",
    async run(_context: CommandContext): Promise<CommandResult> {
      try {
        const content = readFileSync(path.resolve(process.cwd(), "CHANGELOG.md"), "utf8");
        return { text: content.split("\n").slice(0, 40).join("\n").slice(0, 1900) };
      } catch {
        return { text: "CHANGELOG.md is not available in this deployment." };
      }
    },
  },
  {
    aliases: [],
    usage: ["!changelog"],
    examples: ["!changelog"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: true,
  },
);
