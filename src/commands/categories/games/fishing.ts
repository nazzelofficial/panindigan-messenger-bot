import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Fish {
  readonly name: string;
  readonly weight: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly value: number;
  readonly icon: string;
}

const FISH: readonly Fish[] = [
  { name: "Sardine", weight: 30, minimum: 1, maximum: 3, value: 2, icon: "🐟" },
  { name: "Tilapia", weight: 25, minimum: 2, maximum: 6, value: 5, icon: "🐠" },
  { name: "Mackerel", weight: 18, minimum: 3, maximum: 9, value: 10, icon: "🐟" },
  { name: "Salmon", weight: 12, minimum: 5, maximum: 14, value: 20, icon: "🐡" },
  { name: "Tuna", weight: 8, minimum: 8, maximum: 25, value: 45, icon: "🐟" },
  { name: "Marlin", weight: 4, minimum: 15, maximum: 45, value: 100, icon: "🦈" },
  { name: "Golden Dorado", weight: 2, minimum: 10, maximum: 30, value: 250, icon: "🏅" },
  { name: "Ancient Catfish", weight: 1, minimum: 20, maximum: 60, value: 500, icon: "🐋" },
];

type Bait = "basic" | "lure" | "net";

function adjustedWeight(fish: Fish, bait: Bait): number {
  if (bait === "lure") return fish.value >= 20 ? fish.weight * 3 : fish.weight;
  if (bait === "net") return fish.value < 20 ? fish.weight * 3 : fish.weight;
  return fish.weight;
}

function catchFish(bait: Bait): { fish: Fish; kilograms: number; points: number } {
  const weights = FISH.map((fish) => adjustedWeight(fish, bait));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = randomInt(1, total);
  let index = 0;
  for (let cursor = 0; cursor < weights.length; cursor += 1) {
    if (roll <= weights[cursor]!) {
      index = cursor;
      break;
    }
    roll -= weights[cursor]!;
  }
  const fish = FISH[index]!;
  const kilograms = randomInt(fish.minimum, fish.maximum);
  return { fish, kilograms, points: kilograms * fish.value };
}

export default createCommand(
  {
    name: "fishing",
    description:
      "Cast real weighted lines for fish with bait-dependent rarity and compute each catch's value.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const rawBait = (context.args.positional[0] ?? "basic").toLowerCase();
      const rawCasts = context.args.positional[1] ?? "3";
      if (!["basic", "lure", "net"].includes(rawBait)) {
        return {
          text: "❌ Choose a bait: `basic`, `lure` (boosts rare fish) or `net` (boosts common fish).",
        };
      }
      const casts = Number(rawCasts);
      if (!Number.isInteger(casts) || casts < 1 || casts > 10) {
        return {
          text: "❌ Cast count must be a whole number from 1 to 10, e.g. `!fishing lure 5`.",
        };
      }
      const bait = rawBait as Bait;
      const results = Array.from({ length: casts }, () => catchFish(bait));
      const totalPoints = results.reduce((sum, result) => sum + result.points, 0);
      const heaviest = results.reduce(
        (best, result) => (result.kilograms > best.kilograms ? result : best),
        results[0]!,
      );
      const lines = results.map(
        (result, index) =>
          `${index + 1}. ${result.fish.icon} ${result.fish.name} — ${formatInteger(result.kilograms)} kg · ${formatInteger(result.points)} pts`,
      );
      return {
        text: `🎣 **Fishing Trip** — ${formatInteger(casts)} cast${casts === 1 ? "" : "s"} with ${bait} bait.\n\n${lines.join("\n")}\n\nTotal value: ${formatInteger(totalPoints)} pts · Heaviest: ${heaviest.fish.name} (${formatInteger(heaviest.kilograms)} kg)\nRarest catch: ${[...results].sort((a, b) => b.fish.value - a.fish.value)[0]!.fish.name}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!fishing [basic|lure|net] [casts]", "!fishing lure 5"],
    examples: ["!fishing", "!fishing basic 3", "!fishing lure 10"],
    permission: "public",
    cooldownMs: 2500,
  },
);
