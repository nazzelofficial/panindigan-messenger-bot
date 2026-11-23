import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

const DARES: readonly string[] = [
  "Sing the chorus of a song chosen by the group, with full confidence.",
  "Do your best impression of a famous animal documentary narrator for 30 seconds.",
  "Tell a short story using only three words at a time.",
  "Walk around the room like you're a runway model for one minute.",
  "Speak in rhymes for your next three messages.",
  "Imitate three different accents and let the group guess them.",
  "Post your most embarrassing search result — or invent a plausible one.",
  "Give a heartfelt speech about your favourite snack.",
  "Do ten jumping jacks and report how you feel afterwards.",
  "Describe the last thing you ate as if it were a luxury product.",
  "Make up a handshake and teach it to someone nearby.",
  "Talk like a pirate for five full minutes.",
  "Try to balance a book on your head while answering a question.",
  "Compliment everyone in the chat with a different adjective.",
  "Draw a self-portrait using only emojis.",
  "Narrate your own actions like a sports commentator for one minute.",
  "Say the alphabet backwards as fast as you can.",
  "Pretend you're a weather reporter describing the room.",
  "Share the strangest item currently within arm's reach.",
  "Write a haiku about the person who dared you.",
];

export default createCommand(
  {
    name: "dare",
    description: "Issue a randomly selected, harmless and actually doable dare.",
    category: "entertainment",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: `😈 **Dare** — ${pickRandom(DARES)}` };
    },
  },
  {
    aliases: [],
    usage: ["!dare"],
    examples: ["!dare"],
    permission: "public",
    cooldownMs: 1000,
  },
);
