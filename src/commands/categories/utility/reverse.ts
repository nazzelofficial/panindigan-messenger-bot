import { truncate } from "../../../utils/text.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function argumentText(context: CommandContext): string {
  const raw = context.args.raw.trim();
  const separator = raw.search(/\s/);
  return separator === -1 ? "" : raw.slice(separator).trim();
}

export default createCommand(
  {
    name: "reverse",
    description: "Reverse the characters of text you supply, preserving Unicode code points.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = argumentText(context);
      if (!text) return { text: "Provide text to reverse, for example: !reverse hello world" };
      return { text: truncate(Array.from(text).reverse().join(""), 2000) };
    },
  },
  {
    aliases: [],
    usage: ["!reverse TEXT"],
    examples: ["!reverse hello world", "!reverse 12345"],
    permission: "public",
    cooldownMs: 300,
  },
);
