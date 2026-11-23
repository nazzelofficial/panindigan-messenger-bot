import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Animal {
  readonly name: string;
  readonly icon: string;
  readonly difficulty: number;
  readonly reward: number;
  readonly minimumWeight: number;
  readonly maximumWeight: number;
}

interface Weapon {
  readonly name: string;
  readonly bonus: number;
}

const TERRAINS: Readonly<Record<string, readonly Animal[]>> = {
  forest: [
    {
      name: "Wild Boar",
      icon: "🐗",
      difficulty: 20,
      reward: 45,
      minimumWeight: 40,
      maximumWeight: 120,
    },
    {
      name: "Red Deer",
      icon: "🦌",
      difficulty: 30,
      reward: 80,
      minimumWeight: 60,
      maximumWeight: 180,
    },
    {
      name: "Gray Wolf",
      icon: "🐺",
      difficulty: 40,
      reward: 120,
      minimumWeight: 25,
      maximumWeight: 55,
    },
    {
      name: "Brown Bear",
      icon: "🐻",
      difficulty: 60,
      reward: 300,
      minimumWeight: 180,
      maximumWeight: 450,
    },
  ],
  savanna: [
    {
      name: "Impala",
      icon: "🦌",
      difficulty: 15,
      reward: 40,
      minimumWeight: 30,
      maximumWeight: 75,
    },
    {
      name: "Warthog",
      icon: "🐗",
      difficulty: 28,
      reward: 65,
      minimumWeight: 45,
      maximumWeight: 110,
    },
    {
      name: "Zebra",
      icon: "🦓",
      difficulty: 38,
      reward: 110,
      minimumWeight: 200,
      maximumWeight: 350,
    },
    {
      name: "Lion",
      icon: "🦁",
      difficulty: 70,
      reward: 400,
      minimumWeight: 150,
      maximumWeight: 250,
    },
  ],
  arctic: [
    {
      name: "Arctic Hare",
      icon: "🐇",
      difficulty: 12,
      reward: 35,
      minimumWeight: 2,
      maximumWeight: 6,
    },
    {
      name: "Snow Fox",
      icon: "🦊",
      difficulty: 30,
      reward: 90,
      minimumWeight: 3,
      maximumWeight: 8,
    },
    {
      name: "Caribou",
      icon: "🦌",
      difficulty: 42,
      reward: 150,
      minimumWeight: 90,
      maximumWeight: 220,
    },
    {
      name: "Polar Bear",
      icon: "🐻‍❄️",
      difficulty: 75,
      reward: 500,
      minimumWeight: 300,
      maximumWeight: 700,
    },
  ],
};

const WEAPONS: readonly Weapon[] = [
  { name: "bow", bonus: 10 },
  { name: "rifle", bonus: 25 },
  { name: "spear", bonus: 0 },
  { name: "trap", bonus: -10 },
];

export default createCommand(
  {
    name: "hunt",
    description:
      "Hunt animals across real terrain tables with weapon-based success chances and computed rewards.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const [rawWeapon, rawTerrain, rawAttempts] = context.args.positional;
      if (rawWeapon === undefined) {
        return {
          text: "🏹 **Hunt**\nUsage: `!hunt <bow|rifle|spear|trap> [forest|savanna|arctic] [attempts]`\nExample: `!hunt bow forest 3`\nEach attempt encounters a real animal with a difficulty-based success chance.",
        };
      }
      const weapon = WEAPONS.find((entry) => entry.name === rawWeapon.toLowerCase());
      if (weapon === undefined)
        return {
          text: `❌ Unknown weapon "${rawWeapon}". Choose ${WEAPONS.map((entry) => entry.name).join(", ")}.`,
        };
      const terrain = (rawTerrain ?? "forest").toLowerCase();
      const animals = TERRAINS[terrain];
      if (animals === undefined)
        return { text: `❌ Unknown terrain "${rawTerrain}". Choose forest, savanna or arctic.` };
      const attempts = rawAttempts === undefined ? 1 : Number(rawAttempts);
      if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
        return {
          text: "❌ Attempts must be a whole number from 1 to 5, e.g. `!hunt rifle arctic 2`.",
        };
      }
      const lines: string[] = [];
      let totalReward = 0;
      let successes = 0;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const animal = pickRandom(animals);
        const chance = Math.max(5, Math.min(95, 55 + weapon.bonus - animal.difficulty));
        if (randomInt(1, 100) <= chance) {
          const kilograms = randomInt(animal.minimumWeight, animal.maximumWeight);
          const reward = animal.reward + kilograms;
          totalReward += reward;
          successes += 1;
          lines.push(
            `${attempt}. ${animal.icon} ${animal.name} — caught at ${formatInteger(kilograms)} kg (+${formatInteger(reward)} pts, ${formatInteger(chance)}% chance)`,
          );
        } else {
          lines.push(
            `${attempt}. ${animal.icon} ${animal.name} — escaped (${formatInteger(chance)}% chance)`,
          );
        }
      }
      return {
        text: `🏹 **Hunt** — ${formatInteger(successes)}/${formatInteger(attempts)} successful in the ${terrain} with a ${weapon.name}.\n\n${lines.join("\n")}\n\nTotal reward: ${formatInteger(totalReward)} pts`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!hunt <weapon> [terrain] [attempts]", "!hunt bow forest 3"],
    examples: ["!hunt bow", "!hunt rifle savanna 2", "!hunt spear arctic"],
    permission: "public",
    cooldownMs: 2500,
  },
);
