import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const ROASTS: readonly string[] = [
  "You're the reason the instruction manual has pictures.",
  "If laziness were an Olympic sport, you'd light the torch.",
  "I'd tell you a joke about your intelligence, but it'd go over your head.",
  "You're not even wrong — you're just confidently misinformed.",
  "If you were a spice, you'd be flour.",
  "You bring a spoon to a knife fight.",
  "Your ideas are like a screen door on a submarine.",
  "You're the human version of a software update nobody asked for.",
  "Even your shadow is embarrassed to be seen with you.",
  "You're proof that evolution can go in reverse.",
  "You have the strategic depth of a puddle.",
  "If procrastination were a job, you'd be CEO.",
  "You're like a cloud — full of hot air and never actually raining.",
  "Your comebacks arrive later than your apologies.",
  "You're the plot twist nobody wanted in this conversation.",
  "I'd call you a tool, but tools are useful.",
  "You're the reason they invented the mute button.",
  "Your confidence has a better imagination than your skill.",
  "You're like a broken compass — always pointing somewhere wrong.",
  "You could trip over a wireless connection.",
];

export default createCommand(
  {
    name: "roast",
    description: "Deliver a good-natured, randomly selected roast line.",
    category: "entertainment",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: `🔥 **Roast** — ${pickRandom(ROASTS)}` };
    },
  },
  {
    aliases: [],
    usage: ["!roast"],
    examples: ["!roast"],
    permission: "public",
    cooldownMs: 1500,
  },
);
