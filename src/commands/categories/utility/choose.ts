import { randomInt } from "node:crypto";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "choose",
    description: "Pick one option uniformly at random from a list you supply.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const options =
        context.args.positional.length > 0
          ? context.args.positional
          : context.args.raw
              .replace(/^\S+\s*/, "")
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
      if (options.length < 2)
        return { text: "Give me at least two choices, separated by spaces or commas." };
      const index = randomInt(options.length);
      return {
        text: `I choose option ${index + 1}: ${options[index] ?? ""}\n(From ${options.length} options.)`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!choose OPTION1 OPTION2 [OPTION3 ...]"],
    examples: ["!choose coffee tea juice", "!choose red, blue, green"],
    permission: "public",
    cooldownMs: 500,
  },
);
