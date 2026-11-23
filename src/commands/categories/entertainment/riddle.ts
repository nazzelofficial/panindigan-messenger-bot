import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";
import { sha256 } from "../../../utils/crypto.js";

interface Riddle {
  readonly question: string;
  readonly answer: string;
  readonly hint: string;
}

const RIDDLES: readonly Riddle[] = [
  {
    question:
      "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answer: "an echo",
    hint: "It repeats you.",
  },
  {
    question: "The more of this there is, the less you see. What is it?",
    answer: "darkness",
    hint: "Think about light.",
  },
  {
    question:
      "I have keys but no locks. I have a space but no room. You can enter, but can't go outside. What am I?",
    answer: "a keyboard",
    hint: "You type on it.",
  },
  {
    question: "What has a head, a tail, is brown, and has no legs?",
    answer: "a penny",
    hint: "It is money.",
  },
  {
    question: "What runs around the whole yard without moving?",
    answer: "a fence",
    hint: "It marks a boundary.",
  },
  {
    question:
      "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?",
    answer: "fire",
    hint: "It needs oxygen.",
  },
  {
    question: "What has many keys but can't open a single lock?",
    answer: "a piano",
    hint: "It makes music.",
  },
  {
    question:
      "The person who makes it, sells it. The person who buys it never uses it. The person who uses it never knows they're using it. What is it?",
    answer: "a coffin",
    hint: "It is used after life.",
  },
  {
    question: "What can travel around the world while staying in a corner?",
    answer: "a stamp",
    hint: "It goes on a letter.",
  },
  {
    question:
      "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
    answer: "a map",
    hint: "It shows places.",
  },
  {
    question: "What is so fragile that saying its name breaks it?",
    answer: "silence",
    hint: "Speaking ends it.",
  },
  { question: "What has a neck but no head?", answer: "a bottle", hint: "It holds liquid." },
  {
    question: "What goes up but never comes down?",
    answer: "your age",
    hint: "It only increases.",
  },
  {
    question:
      "I am taken from a mine, and shut up in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?",
    answer: "pencil lead",
    hint: "It is graphite.",
  },
  { question: "What has teeth but cannot bite?", answer: "a comb", hint: "It fixes hair." },
  {
    question:
      "What runs but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?",
    answer: "a river",
    hint: "It flows.",
  },
  {
    question: "What is full of holes but still holds water?",
    answer: "a sponge",
    hint: "It absorbs.",
  },
  {
    question: "What can be broken without being held?",
    answer: "a promise",
    hint: "It is a commitment.",
  },
  {
    question: "I have a face but no eyes, hands but no arms. What am I?",
    answer: "a clock",
    hint: "It tells time.",
  },
  {
    question: "The more you take, the more you leave behind. What am I?",
    answer: "footsteps",
    hint: "You make them walking.",
  },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default createCommand(
  {
    name: "riddle",
    description: "Solve today's riddle with a hint, check a guess, or reveal the verified answer.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const seed = sha256(`${new Date().toISOString().slice(0, 10)}|riddle`);
      const riddle = RIDDLES[parseInt(seed.slice(0, 8), 16) % RIDDLES.length]!;
      const raw = context.args.positional.join(" ").trim();
      if (raw.length === 0) {
        return {
          text: `🧩 **Riddle of the Day** (#${formatInteger(RIDDLES.indexOf(riddle) + 1)})\n\n${riddle.question}\n\nHint: ${riddle.hint}\nUsage: \`!riddle <your answer>\` or \`!riddle answer\` to reveal.`,
        };
      }
      if (raw.toLowerCase() === "answer") {
        return { text: `💡 **Answer** — ${riddle.answer}.\n\n${riddle.question}` };
      }
      const guess = normalize(raw);
      const accepted = normalize(riddle.answer);
      if (guess === accepted || (accepted.includes(guess) && guess.length >= 3)) {
        return { text: `🎉 **Correct!** The answer is ${riddle.answer}. Well reasoned!` };
      }
      return {
        text: `🤔 Not quite — "${raw}" is not the answer. Hint: ${riddle.hint}\nTry \`!riddle answer\` if you give up.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!riddle", "!riddle <guess>", "!riddle answer"],
    examples: ["!riddle", "!riddle echo", "!riddle answer"],
    permission: "public",
    cooldownMs: 1200,
  },
);
