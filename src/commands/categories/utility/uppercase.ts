import { truncate } from "../../../utils/text.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function argumentText(context: CommandContext): string {
  const raw = context.args.raw.trim();
  const separator = raw.search(/\s/);
  return separator === -1 ? "" : raw.slice(separator).trim();
}

export default createCommand(
  {
    name: "uppercase",
    description: "Convert the supplied text to upper case using Unicode-aware casing.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = argumentText(context);
      if (!text) return { text: "Provide text, for example: !uppercase hello world" };
      return { text: truncate(text.toUpperCase(), 2000) };
    },
  },
  {
    aliases: [],
    usage: ["!uppercase TEXT"],
    examples: ["!uppercase hello world", "!uppercase straße"],
    permission: "public",
    cooldownMs: 300,
  },
);
