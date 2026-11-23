import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const COMPLIMENTS: readonly string[] = [
  "Your smile could make a cloudy day reconsider its choices.",
  "You have the kind of calm that makes rooms feel safer.",
  "Your curiosity is genuinely contagious.",
  "You explain things with a clarity most people never manage.",
  "You have excellent taste — in everything from music to snacks.",
  "The way you listen makes people feel truly seen.",
  "You're wildly underrated and it shows.",
  "Your laugh is the best part of any room you walk into.",
  "You have a brain that clearly enjoys being used.",
  "Your kindness is quiet, but it leaves a mark.",
  "You make hard things look effortless.",
  "You have the rare gift of making strangers feel at home.",
  "Your style is unmistakably you — and that's the best look.",
  "You ask the questions nobody else thinks to ask.",
  "Your patience is a superpower.",
  "You have an infectious energy that lifts everyone around you.",
  "You're the friend people hope they get.",
  "Your ideas have a habit of being right.",
  "You handle pressure with a grace most people fake.",
  "The world is a little brighter with you in it.",
];

export default createCommand(
  {
    name: "compliment",
    description: "Brighten someone's day with a randomly chosen genuine compliment.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional.join(" ").trim();
      return {
        text: `💛 **Compliment**${target === "" ? "" : ` for ${target}`} — ${pickRandom(COMPLIMENTS)}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!compliment [name]", "!compliment Alex"],
    examples: ["!compliment", "!compliment Alex"],
    permission: "public",
    cooldownMs: 1000,
  },
);
