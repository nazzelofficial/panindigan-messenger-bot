import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const FORTUNES: readonly string[] = [
  "A pleasant surprise is waiting for you at the end of a long week.",
  "Your patience will be rewarded sooner than you expect.",
  "A new friendship begins with a simple, honest question.",
  "The risk you have been considering is smaller than it looks.",
  "Good news travels faster than you think — keep your phone close.",
  "An old problem finally has a simple solution.",
  "You will find what you are looking for in the last place you check.",
  "Your creativity is about to pay off in an unexpected way.",
  "A short journey brings a long-lasting memory.",
  "Someone is quietly grateful for something you did this week.",
  "A financial opportunity appears — read the fine print first.",
  "Your confidence is your greatest asset today.",
  "Let go of a small worry; it has already solved itself.",
  "A message you have been waiting for arrives when you least expect it.",
  "Helping someone else unlocks your own progress.",
  "The next chapter is brighter than the one you are leaving.",
  "A conversation over food changes your perspective.",
  "Your careful planning prevents a problem you never see.",
  "An invitation you almost decline turns out to be worth accepting.",
  "Something you planted months ago is finally ready to bloom.",
];

export default createCommand(
  {
    name: "fortune",
    description: "Open a fortune cookie with a fresh message and genuinely computed lucky numbers.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const name = context.args.raw.trim();
      const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${name}|fortune`);
      const numbers = [0, 1, 2, 3, 4].map(
        (index) => (parseInt(seed.slice(index * 4, index * 4 + 4), 16) % 49) + 1,
      );
      return {
        text: `🥠 **Fortune Cookie**${name === "" ? "" : ` for ${name}`}\n\n${pickRandom(FORTUNES)}\n\nLucky numbers: ${numbers.map((number) => formatInteger(number)).join(" · ")}\nThe numbers are derived from today's date and your name, so they stay consistent.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!fortune [name]", "!fortune Alex"],
    examples: ["!fortune", "!fortune Alex"],
    permission: "public",
    cooldownMs: 1000,
  },
);
