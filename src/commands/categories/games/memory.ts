import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const ICONS: readonly string[] = ["🍎", "🍌", "🍇", "🍊", "🍓", "🍒", "🍍", "🥝"];

function seededShuffle(items: readonly string[], seed: string): string[] {
  const result = [...items];
  let state = parseInt(sha256(seed).slice(0, 8), 16) >>> 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    const swap = Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296) * (index + 1));
    const current = result[index]!;
    result[index] = result[swap]!;
    result[swap] = current;
  }
  return result;
}

function dailyBoard(senderId: string): string[] {
  return seededShuffle(
    ICONS.flatMap((icon) => [icon, icon]),
    `${new Date().toISOString().slice(0, 10)}|${senderId}|memory`,
  );
}

function renderBoard(board: readonly string[], revealed: ReadonlySet<number>): string {
  const rows: string[] = [];
  for (let row = 0; row < 4; row += 1) {
    rows.push(
      board
        .slice(row * 4, row * 4 + 4)
        .map((icon, col) => (revealed.has(row * 4 + col) ? icon : "❔"))
        .join(" "),
    );
  }
  return rows.join("\n");
}

export default createCommand(
  {
    name: "memory",
    description:
      "Play a memory matching round or check two cards on today's shuffled 16-card board.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const board = dailyBoard(context.senderId);
      const [firstRaw, secondRaw] = context.args.positional;
      if (firstRaw !== undefined || secondRaw !== undefined) {
        if (firstRaw === undefined || secondRaw === undefined) {
          return {
            text: "❌ Provide exactly two card positions, e.g. `!memory 3 7` (positions 1–16).",
          };
        }
        const positions = [firstRaw, secondRaw].map((raw) => Number(raw) - 1);
        if (
          positions.some(
            (position) => !Number.isInteger(position) || position < 0 || position >= 16,
          )
        ) {
          return { text: "❌ Card positions must be whole numbers from 1 to 16." };
        }
        if (positions[0] === positions[1])
          return { text: "❌ You cannot flip the same card twice." };
        const matched = board[positions[0]!] === board[positions[1]!];
        return {
          text: `🧠 **Memory** — ${matched ? "🎉 Match!" : "🙈 No match."}\n\n${renderBoard(board, new Set(positions))}\n\nCard ${formatInteger(positions[0]! + 1)}: ${board[positions[0]!]}\nCard ${formatInteger(positions[1]! + 1)}: ${board[positions[1]!]}\nThere are ${formatInteger(8)} pairs hidden in today's board.`,
        };
      }
      const memory = new Map<number, string>();
      const matched = new Set<number>();
      let flips = 0;
      let pairs = 0;
      while (matched.size < 16) {
        const known = [...memory.entries()].filter(([index]) => !matched.has(index));
        let found: [number, number] | undefined;
        for (let a = 0; a < known.length && found === undefined; a += 1) {
          for (let b = a + 1; b < known.length; b += 1) {
            if (known[a]![1] === known[b]![1]) {
              found = [known[a]![0], known[b]![0]];
              break;
            }
          }
        }
        if (found !== undefined) {
          matched.add(found[0]);
          matched.add(found[1]);
          flips += 2;
          pairs += 1;
          continue;
        }
        const next = board.findIndex((_, index) => !memory.has(index) && !matched.has(index));
        if (next === -1) break;
        memory.set(next, board[next]!);
        flips += 1;
      }
      const efficiency = Math.round((16 / flips) * 100);
      return {
        text: `🧠 **Memory** — perfect-memory solver cleared all ${formatInteger(pairs)} pairs.\n\n${renderBoard(board, new Set(board.map((_, index) => index)))}\n\nTotal flips: ${formatInteger(flips)} (minimum 16) · Efficiency: ${formatInteger(efficiency)}%\nUse \`!memory 3 7\` to flip two specific cards yourself.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!memory", "!memory <position> <position>"],
    examples: ["!memory", "!memory 3 7"],
    permission: "public",
    cooldownMs: 2000,
  },
);
