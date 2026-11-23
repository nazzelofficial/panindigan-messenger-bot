import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const ANSWERS: readonly string[] = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes, definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

export default createCommand(
  {
    name: "8ball",
    description:
      "Ask the magic 8-ball a yes-or-no question and receive one of its twenty classic answers.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const question = context.args.raw.trim();
      if (question.length === 0) {
        return {
          text: "🎱 **Magic 8-Ball**\nUsage: `!8ball Will it rain tomorrow?`\nAsk a clear yes-or-no question and shake the ball.",
        };
      }
      return {
        text: `🎱 **Magic 8-Ball**\n\nQuestion: ${question}\nAnswer: **${pickRandom(ANSWERS)}**`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!8ball <question>", "!8ball Will it rain tomorrow?"],
    examples: ["!8ball Will I win?", "!8ball Is today my lucky day?"],
    permission: "public",
    cooldownMs: 1000,
  },
);
