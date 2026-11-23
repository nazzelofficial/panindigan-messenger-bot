import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface ClassSpec {
  readonly name: string;
  readonly hp: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly crit: number;
}

interface Unit {
  readonly spec: ClassSpec;
  readonly name: string;
  hp: number;
}

const CLASSES: readonly ClassSpec[] = [
  { name: "Warrior", hp: 110, minimum: 8, maximum: 18, crit: 15 },
  { name: "Mage", hp: 75, minimum: 14, maximum: 28, crit: 25 },
  { name: "Archer", hp: 90, minimum: 10, maximum: 22, crit: 30 },
  { name: "Rogue", hp: 85, minimum: 9, maximum: 20, crit: 40 },
  { name: "Knight", hp: 130, minimum: 7, maximum: 15, crit: 10 },
];

function unit(spec: ClassSpec, team: string, index: number): Unit {
  return { spec, name: `${team}-${index + 1} ${spec.name}`, hp: spec.hp };
}

export default createCommand(
  {
    name: "battle",
    description:
      "Simulate a full 3v3 team battle with turn order, critical hits and surviving units computed round by round.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional.slice(0, 3);
      if (raw.length === 0) {
        return {
          text: `🛡️ **Battle** — pick up to three classes: ${CLASSES.map((spec) => spec.name.toLowerCase()).join(", ")}.\nUsage: \`!battle warrior mage archer\`\nWith no arguments both teams are drafted randomly.`,
        };
      }
      const chosen: ClassSpec[] = [];
      for (const name of raw) {
        const spec = CLASSES.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
        if (spec === undefined)
          return {
            text: `❌ Unknown class "${name}". Choose ${CLASSES.map((entry) => entry.name.toLowerCase()).join(", ")}.`,
          };
        chosen.push(spec);
      }
      const allies: Unit[] = chosen.map((spec, index) => unit(spec, "Ally", index));
      const enemies: Unit[] = Array.from({ length: allies.length }, (_, index) =>
        unit(pickRandom(CLASSES), "Enemy", index),
      );
      const log: string[] = [];
      let rounds = 0;
      while (
        allies.some((member) => member.hp > 0) &&
        enemies.some((member) => member.hp > 0) &&
        rounds < 100
      ) {
        rounds += 1;
        const roundNotes: string[] = [];
        for (const team of [allies, enemies]) {
          for (const attacker of team) {
            if (attacker.hp <= 0) continue;
            const foes = (team === allies ? enemies : allies).filter((member) => member.hp > 0);
            if (foes.length === 0) break;
            const target = pickRandom(foes);
            const critical = randomInt(1, 100) <= attacker.spec.crit;
            const damage =
              randomInt(attacker.spec.minimum, attacker.spec.maximum) * (critical ? 2 : 1);
            target.hp = Math.max(0, target.hp - damage);
            roundNotes.push(
              `${attacker.name} → ${target.name}: ${formatInteger(damage)}${critical ? " CRIT" : ""}`,
            );
          }
        }
        if (roundNotes.length > 0)
          log.push(`Round ${formatInteger(rounds)}: ${roundNotes.join("; ")}`);
      }
      const allySurvivors = allies.filter((member) => member.hp > 0);
      const enemySurvivors = enemies.filter((member) => member.hp > 0);
      const verdict =
        allySurvivors.length > 0 && enemySurvivors.length === 0
          ? "🎉 Your team wins!"
          : enemySurvivors.length > 0 && allySurvivors.length === 0
            ? "🤖 Enemy team wins."
            : "⏱️ Battle ended by round limit.";
      const roster = (team: readonly Unit[]): string =>
        team
          .map(
            (member) =>
              `${member.name} ${formatInteger(member.hp)}/${formatInteger(member.spec.hp)}HP`,
          )
          .join(", ");
      return {
        text: `🛡️ **Battle** — ${verdict}\n\nRounds fought: ${formatInteger(rounds)}\nYour team: ${roster(allies)}\nEnemy team: ${roster(enemies)}\nSurvivors — you: ${formatInteger(allySurvivors.length)}, enemy: ${formatInteger(enemySurvivors.length)}\n\n${log.slice(-8).join("\n")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!battle [class class class]", "!battle warrior mage archer"],
    examples: ["!battle", "!battle knight rogue mage"],
    permission: "public",
    cooldownMs: 3000,
  },
);
