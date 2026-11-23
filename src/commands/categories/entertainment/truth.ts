import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const TRUTHS: readonly string[] = [
  "What is one thing you've always wanted to try but never have?",
  "What is the most embarrassing thing that ever happened to you?",
  "What is a small habit that instantly improves your day?",
  "If you could relive one day of your life, which would it be and why?",
  "What is a skill you secretly wish you had?",
  "What is the last thing that made you laugh out loud?",
  "What is a food you used to hate but love now?",
  "Who was your childhood hero, and would they still be your hero today?",
  "What is a compliment you still remember years later?",
  "What is the strangest dream you can recall?",
  "If you could only eat one meal for a month, what would it be?",
  "What is something you're proud of that nobody knows about?",
  "What is the best piece of advice you've ever received?",
  "What is a movie you can quote from memory?",
  "What is one thing you'd change about your daily routine?",
  "What is the nicest thing a stranger has ever done for you?",
  "What is a topic you could talk about for an hour?",
  "What was your first-ever concert or live event?",
  "What is something that always makes you nervous?",
  "If you could meet any historical figure, who would it be?",
];

export default createCommand(
  {
    name: "truth",
    description: "Ask a randomly selected, genuinely open-ended truth question.",
    category: "entertainment",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: `🙊 **Truth** — ${pickRandom(TRUTHS)}` };
    },
  },
  {
    aliases: [],
    usage: ["!truth"],
    examples: ["!truth"],
    permission: "public",
    cooldownMs: 1000,
  },
);
