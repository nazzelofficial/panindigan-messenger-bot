import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const LINES: readonly string[] = [
  "Are you a magician? Because whenever I look at you, everyone else disappears.",
  "Do you have a map? I keep getting lost in your eyes.",
  "Are you a parking ticket? Because you've got fine written all over you.",
  "If you were a fruit, you'd be a fineapple.",
  "Do you have a name, or can I call you mine?",
  "Are you a camera? Because every time I look at you, I smile.",
  "You must be a snowflake, because you've blown me away.",
  "Do you like raisins? How do you feel about a date?",
  "Is your name Wi-Fi? Because I'm really feeling a connection.",
  "You look so good, you make me forget my pick-up line.",
  "Are you a bank loan? Because you've got my interest.",
  "Do you believe in love at first sight, or should I walk by again?",
  "If you were a vegetable, you'd be a cute-cumber.",
  "Are you a time machine? Because I could see us together in the future.",
  "Do you have a band-aid? I just scraped my knee falling for you.",
  "You're the cheese to my macaroni.",
  "Is your dad a boxer? Because you're a knockout.",
  "Are you made of copper and tellurium? Because you're Cu-Te.",
  "I would tell you a chemistry joke, but I know I wouldn't get a reaction.",
  "You must be made of fireworks, because you're dynamite.",
];

export default createCommand(
  {
    name: "pickup",
    description: "Drop a delightfully corny, randomly chosen pickup line.",
    category: "entertainment",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: `😏 **Pickup Line** — ${pickRandom(LINES)}` };
    },
  },
  {
    aliases: [],
    usage: ["!pickup"],
    examples: ["!pickup"],
    permission: "public",
    cooldownMs: 1500,
  },
);
