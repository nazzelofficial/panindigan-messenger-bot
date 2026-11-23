import { randomUUID } from "node:crypto";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "uuid",
    description: "Generate one or more cryptographically random RFC 4122 version 4 UUIDs.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = Number(context.args.positional[0] ?? "1");
      if (!Number.isFinite(requested))
        return { text: "Provide a whole-number count, for example: !uuid 5" };
      const count = Math.min(20, Math.max(1, Math.trunc(requested)));
      const values = Array.from({ length: count }, () => randomUUID());
      return { text: `UUID v4${count === 1 ? "" : ` ×${count}`}:\n${values.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!uuid [count]"],
    examples: ["!uuid", "!uuid 5"],
    permission: "public",
    cooldownMs: 500,
  },
);
