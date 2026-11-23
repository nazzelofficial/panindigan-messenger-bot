import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

interface Riddle {
  readonly question: string;
  readonly answer: string;
}

const RIDDLES: readonly Riddle[] = [
  {
    question:
      "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answer: "an echo",
  },
  { question: "The more of this there is, the less you see. What is it?", answer: "darkness" },
  {
    question:
      "I have keys but no locks. I have a space but no room. You can enter, but can't go outside. What am I?",
    answer: "a keyboard",
  },
  { question: "What has a head, a tail, is brown, and has no legs?", answer: "a penny" },
  { question: "What runs around the whole yard without moving?", answer: "a fence" },
  {
    question:
      "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
    answer: "fire",
  },
  { question: "What has many keys but can't open a single lock?", answer: "a piano" },
  {
    question:
      "The person who makes it, sells it. The person who buys it never uses it. The person who uses it never knows they're using it. What is it?",
    answer: "a coffin",
  },
  { question: "What can travel around the world while staying in a corner?", answer: "a stamp" },
  {
    question:
      "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
    answer: "a map",
  },
  { question: "What is so fragile that saying its name breaks it?", answer: "silence" },
  { question: "What has a neck but no head?", answer: "a bottle" },
  { question: "What goes up but never comes down?", answer: "your age" },
  {
    question:
      "I am taken from a mine, and shut up in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?",
    answer: "pencil lead",
  },
  { question: "What has teeth but cannot bite?", answer: "a comb" },
  {
    question:
      "What runs but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?",
    answer: "a river",
  },
  { question: "What is full of holes but still holds water?", answer: "a sponge" },
  { question: "What can be broken without being held?", answer: "a promise" },
  { question: "I have a face but no eyes, hands but no arms. What am I?", answer: "a clock" },
  { question: "The more you take, the more you leave behind. What am I?", answer: "footsteps" },
];

export default createCommand(
  {
    name: "riddles",
    description:
      "Browse the full numbered riddle archive and look up any riddle together with its answer.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      if (raw === undefined) {
        const list = RIDDLES.map(
          (riddle, index) => `${formatInteger(index + 1)}. ${riddle.question}`,
        ).join("\n");
        return {
          text: `📚 **Riddle Archive** — ${formatInteger(RIDDLES.length)} riddles.\n\n${list}\n\nUsage: \`!riddles <number>\` to reveal a specific riddle and answer.`,
        };
      }
      const number = Number(raw);
      if (!Number.isInteger(number) || number < 1 || number > RIDDLES.length) {
        return { text: `❌ Choose a riddle number from 1 to ${formatInteger(RIDDLES.length)}.` };
      }
      const riddle = RIDDLES[number - 1]!;
      return {
        text: `🧩 **Riddle #${formatInteger(number)}**\n\n${riddle.question}\n\n💡 Answer: ${riddle.answer}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!riddles", "!riddles <number>"],
    examples: ["!riddles", "!riddles 7"],
    permission: "public",
    cooldownMs: 1500,
  },
);
