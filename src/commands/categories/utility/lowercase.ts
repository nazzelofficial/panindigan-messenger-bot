import { truncate } from "../../../utils/text.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function argumentText(context: CommandContext): string {
  const raw = context.args.raw.trim();
  const separator = raw.search(/\s/);
  return separator === -1 ? "" : raw.slice(separator).trim();
}

export default createCommand(
  {
    name: "lowercase",
    description: "Convert the supplied text to lower case using Unicode-aware casing.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = argumentText(context);
      if (!text) return { text: "Provide text, for example: !lowercase HELLO WORLD" };
      return { text: truncate(text.toLowerCase(), 2000) };
    },
  },
  {
    aliases: [],
    usage: ["!lowercase TEXT"],
    examples: ["!lowercase HELLO WORLD", "!lowercase ÄÖÜ"],
    permission: "public",
    cooldownMs: 300,
  },
);
