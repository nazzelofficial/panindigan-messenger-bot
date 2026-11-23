import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";

interface Dilemma {
  readonly optionA: string;
  readonly optionB: string;
}

const DILEMMAS: readonly Dilemma[] = [
  { optionA: "be able to fly", optionB: "be able to breathe underwater" },
  { optionA: "never use a smartphone again", optionB: "never watch television again" },
  { optionA: "eat only sweet food for a year", optionB: "eat only savoury food for a year" },
  { optionA: "wake up two hours earlier every day", optionB: "stay up two hours later every day" },
  { optionA: "have a personal chef", optionB: "have a personal chauffeur" },
  { optionA: "live in a cabin in the mountains", optionB: "live in a beachfront house" },
  { optionA: "be famous for something you hate", optionB: "be unknown for something you love" },
  { optionA: "lose all your photos", optionB: "lose all your saved messages" },
  { optionA: "always speak in rhymes", optionB: "always whisper" },
  { optionA: "have free unlimited travel", optionB: "have free unlimited food" },
  { optionA: "meet your future self for one hour", optionB: "meet your past self for one hour" },
  { optionA: "have a rewind button for one day", optionB: "have a pause button for one hour" },
  { optionA: "never have to sleep again", optionB: "never have to do laundry again" },
  {
    optionA: "be stuck in a lift with your favourite author",
    optionB: "be stuck in a lift with your favourite musician",
  },
  { optionA: "win a million dollars", optionB: "be guaranteed a long, healthy life" },
  { optionA: "know when you'll die", optionB: "know how you'll die" },
  { optionA: "be the funniest person in the room", optionB: "be the smartest person in the room" },
  { optionA: "read every book ever written", optionB: "visit every country on Earth" },
  { optionA: "have a job you love with low pay", optionB: "have a job you hate with high pay" },
  { optionA: "be able to talk to animals", optionB: "be able to understand every language" },
];

export default createCommand(
  {
    name: "wouldyourather",
    description:
      "Pose a real either-or dilemma from a curated set, record your pick, or let the bot decide for you.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const dilemma = pickRandom(DILEMMAS);
      const answer = context.args.positional[0]?.toLowerCase();
      if (answer !== undefined && !["a", "b", "decide"].includes(answer)) {
        return { text: "❌ Answer with `a`, `b` or `decide`." };
      }
      let decision = "";
      if (answer === "decide") {
        const chosen = pickRandom(["A", "B"] as const);
        decision = `\nThe bot's random pick: **${chosen} — ${chosen === "A" ? dilemma.optionA : dilemma.optionB}**`;
      } else if (answer === "a" || answer === "b") {
        decision = `\nYou chose: **${answer.toUpperCase()} — ${answer === "a" ? dilemma.optionA : dilemma.optionB}**`;
      }
      return {
        text: `⚖️ **Would You Rather...**\n\n**A)** ${dilemma.optionA}\n**B)** ${dilemma.optionB}${decision}\n\nUsage: \`!wouldyourather a\`, \`!wouldyourather b\` or \`!wouldyourather decide\`.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!wouldyourather [a|b]", "!wouldyourather a"],
    examples: ["!wouldyourather", "!wouldyourather b"],
    permission: "public",
    cooldownMs: 1000,
  },
);
