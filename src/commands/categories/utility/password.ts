import { randomInt } from "node:crypto";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const CHARACTER_SETS: Readonly<Record<string, string>> = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};

const PRESETS: Readonly<Record<string, readonly string[]>> = {
  alnum: ["lower", "upper", "digits"],
  all: ["lower", "upper", "digits", "symbols"],
  alpha: ["lower", "upper"],
  numeric: ["digits"],
  symbols: ["symbols"],
  hex: ["digits"],
};

export default createCommand(
  {
    name: "password",
    description:
      "Generate a cryptographically secure random password with configurable sets and length.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const preset = (context.args.named.set ?? "alnum").toLowerCase();
      const names = PRESETS[preset];
      if (!names)
        return {
          text: "Unknown character set. Choose one of: alnum, all, alpha, numeric, symbols, hex.",
        };
      const requested = Number(context.args.positional[0] ?? context.args.named.length ?? "16");
      if (!Number.isFinite(requested)) return { text: "Password length must be a number." };
      const length = Math.min(128, Math.max(8, Math.trunc(requested)));
      const pool =
        preset === "hex"
          ? "0123456789abcdef"
          : names.map((name) => CHARACTER_SETS[name] ?? "").join("");
      if (pool.length === 0) return { text: "That character set has no usable characters." };
      const characters: string[] = [];
      if (preset !== "hex") {
        for (const name of names) {
          const set = CHARACTER_SETS[name] ?? "";
          if (set.length > 0 && characters.length < length)
            characters.push(set[randomInt(set.length)] ?? "");
        }
      }
      while (characters.length < length) characters.push(pool[randomInt(pool.length)] ?? "");
      for (let index = characters.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(index + 1);
        const current = characters[index] ?? "";
        characters[index] = characters[swapIndex] ?? "";
        characters[swapIndex] = current;
      }
      return {
        text: `Generated ${preset} password (${length} characters):\n${characters.join("")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!password [length] [--set=alnum|all|alpha|numeric|symbols|hex]"],
    examples: ["!password", "!password 24 --set=all", "!password 32 --set=hex"],
    permission: "public",
    cooldownMs: 500,
  },
);
