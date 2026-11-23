import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface FighterClass {
  readonly name: string;
  readonly hp: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly crit: number;
  readonly dodge: number;
}

const CLASSES: readonly FighterClass[] = [
  { name: "Warrior", hp: 120, minimum: 8, maximum: 18, crit: 15, dodge: 8 },
  { name: "Mage", hp: 80, minimum: 14, maximum: 28, crit: 25, dodge: 10 },
  { name: "Archer", hp: 95, minimum: 10, maximum: 22, crit: 30, dodge: 18 },
  { name: "Rogue", hp: 90, minimum: 9, maximum: 20, crit: 40, dodge: 25 },
  { name: "Knight", hp: 140, minimum: 7, maximum: 15, crit: 10, dodge: 5 },
];

export default createCommand(
  {
    name: "duel",
    description:
      "Fight a bot in a turn-based duel with real HP, dodge, critical hits and computed damage.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: `⚔️ **Duel** — choose a class: ${CLASSES.map((fighter) => fighter.name.toLowerCase()).join(", ")}.\nUsage: \`!duel mage\`\nStats: ${CLASSES.map((fighter) => `${fighter.name} ${fighter.hp}HP/${fighter.minimum}-${fighter.maximum}DMG`).join(" · ")}`,
        };
      }
      const playerClass = CLASSES.find(
        (fighter) => fighter.name.toLowerCase() === raw.toLowerCase(),
      );
      if (playerClass === undefined)
        return {
          text: `❌ Unknown class "${raw}". Choose ${CLASSES.map((fighter) => fighter.name.toLowerCase()).join(", ")}.`,
        };
      const botClass = pickRandom(CLASSES.filter((fighter) => fighter.name !== playerClass.name));
      let playerHp = playerClass.hp;
      let botHp = botClass.hp;
      const log: string[] = [];
      let turn = 0;
      while (playerHp > 0 && botHp > 0 && turn < 200) {
        const playerAttacks = turn % 2 === 0;
        const attacker = playerAttacks ? playerClass : botClass;
        const defender = playerAttacks ? botClass : playerClass;
        const dodgeRoll = randomInt(1, 100);
        if (dodgeRoll <= defender.dodge) {
          log.push(`${defender.name} dodged!`);
        } else {
          const critical = randomInt(1, 100) <= attacker.crit;
          let damage = randomInt(attacker.minimum, attacker.maximum);
          if (critical) damage *= 2;
          if (playerAttacks) botHp = Math.max(0, botHp - damage);
          else playerHp = Math.max(0, playerHp - damage);
          log.push(
            `${attacker.name} hit for ${formatInteger(damage)}${critical ? " (CRITICAL!)" : ""}`,
          );
        }
        turn += 1;
      }
      const verdict =
        playerHp > 0
          ? "🎉 You won the duel!"
          : botHp > 0
            ? "🤖 The bot won the duel."
            : "🤝 Mutual knockout.";
      return {
        text: `⚔️ **Duel** — ${verdict}\n\nYou: ${playerClass.name} (${formatInteger(playerHp)}/${formatInteger(playerClass.hp)} HP)\nBot: ${botClass.name} (${formatInteger(botHp)}/${formatInteger(botClass.hp)} HP)\nRounds: ${formatInteger(turn)}\n\n${log.slice(-14).join("\n")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!duel <class>", "!duel rogue"],
    examples: ["!duel warrior", "!duel mage", "!duel archer"],
    permission: "public",
    cooldownMs: 3000,
  },
);
