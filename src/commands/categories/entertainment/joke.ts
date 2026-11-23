import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const JOKES: readonly string[] = [
  "Why don't scientists trust atoms? Because they make up everything.",
  "What do you call fake spaghetti? An impasta.",
  "Why did the scarecrow win an award? Because he was outstanding in his field.",
  "What do you call a bear with no teeth? A gummy bear.",
  "Why did the bicycle fall over? Because it was two-tired.",
  "How do you organize a space party? You planet.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What do you get when you cross a snail and a snake? A slowpoke.",
  "Why did the math book look sad? It had too many problems.",
  "What do you call a fish with no eyes? Fsh.",
  "Why was the computer cold? It left its Windows open.",
  "How does a penguin build its house? Igloos it together.",
  "Why did the coffee file a police report? It got mugged.",
  "What did one wall say to the other wall? I'll meet you at the corner.",
  "Why can't your nose be 12 inches long? Because then it would be a foot.",
  "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks.",
  "Why do mushrooms get invited to parties? They're great fun-gi.",
  "What did the grape say when it got stepped on? Nothing, it just let out a little wine.",
  "Why did the tomato turn red? Because it saw the salad dressing.",
  "What do you call a cow with no legs? Ground beef.",
];

export default createCommand(
  {
    name: "joke",
    description: "Tell a randomly chosen classic joke from a curated set of twenty.",
    category: "entertainment",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: `😄 ${pickRandom(JOKES)}` };
    },
  },
  {
    aliases: [],
    usage: ["!joke"],
    examples: ["!joke"],
    permission: "public",
    cooldownMs: 1000,
  },
);
