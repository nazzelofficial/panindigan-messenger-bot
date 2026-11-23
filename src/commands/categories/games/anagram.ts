import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, shuffle } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const DICTIONARY: readonly string[] = [
  "listen",
  "silent",
  "enlist",
  "inlets",
  "evil",
  "live",
  "vile",
  "veil",
  "angel",
  "angle",
  "glean",
  "triangle",
  "integral",
  "dormitory",
  "dirtyroom",
  "astronomer",
  "moonstarer",
  "below",
  "bowel",
  "elbow",
  "earth",
  "heart",
  "hater",
  "night",
  "thing",
  "save",
  "vase",
  "stone",
  "tones",
  "notes",
];

function signature(value: string): string {
  return [...value.toLowerCase()].sort().join("");
}

function findAnagrams(word: string): string[] {
  const key = signature(word);
  return DICTIONARY.filter((entry) => entry !== word.toLowerCase() && signature(entry) === key);
}

export default createCommand(
  {
    name: "anagram",
    description:
      "Find every real anagram of a word from a curated dictionary or get a fresh anagram challenge.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      if (raw === undefined) {
        const challenge = pickRandom(DICTIONARY);
        const letters = shuffle([...challenge.toUpperCase()]).join("");
        return {
          text: `🔀 **Anagram Challenge**\nRearrange **${letters}** (${formatInteger(challenge.length)} letters) into a real word.\nUsage: \`!anagram <your answer>\` to check and see all dictionary anagrams.`,
        };
      }
      const word = raw.toLowerCase().replace(/[^a-z]/g, "");
      if (word.length === 0)
        return { text: "❌ Enter a word made of A–Z letters, e.g. `!anagram listen`." };
      const matches = findAnagrams(word);
      if (matches.length === 0) {
        const counts = new Map<string, number>();
        for (const letter of word) counts.set(letter, (counts.get(letter) ?? 0) + 1);
        const breakdown = [...counts.entries()]
          .map(([letter, count]) => `${letter}×${count}`)
          .join(" ");
        return {
          text: `🔀 **Anagram** — no other word in the ${formatInteger(DICTIONARY.length)}-word dictionary shares the letters of "${raw}".\n\nLetter makeup: ${breakdown}\nTry \`!anagram listen\`, \`!anagram evil\` or \`!anagram stone\`.`,
        };
      }
      return {
        text: `🔀 **Anagram** — "${raw}" has ${formatInteger(matches.length)} anagram${matches.length === 1 ? "" : "s"} in the dictionary:\n\n${matches.map((match) => `• ${match}`).join("\n")}\n\nAll entries share the exact letter multiset: ${signature(word).split("").join(" ")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!anagram [word]", "!anagram listen"],
    examples: ["!anagram", "!anagram triangle", "!anagram evil"],
    permission: "public",
    cooldownMs: 1500,
  },
);
