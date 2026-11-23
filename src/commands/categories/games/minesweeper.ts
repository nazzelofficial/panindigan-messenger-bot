import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { shuffle } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Level {
  readonly rows: number;
  readonly cols: number;
  readonly mines: number;
}

const LEVELS: Readonly<Record<string, Level>> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 24 },
  hard: { rows: 16, cols: 16, mines: 40 },
};

function neighbours(index: number, rows: number, cols: number): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) result.push(r * cols + c);
    }
  }
  return result;
}

function buildField(level: Level, firstClick: number): { mines: Set<number>; counts: number[] } {
  const total = level.rows * level.cols;
  const protectedCells = new Set([firstClick, ...neighbours(firstClick, level.rows, level.cols)]);
  const candidates = shuffle(
    Array.from({ length: total }, (_, index) => index).filter(
      (index) => !protectedCells.has(index),
    ),
  );
  const mines = new Set(candidates.slice(0, level.mines));
  const counts = Array.from(
    { length: total },
    (_, index) =>
      neighbours(index, level.rows, level.cols).filter((neighbour) => mines.has(neighbour)).length,
  );
  return { mines, counts };
}

function render(
  mines: ReadonlySet<number>,
  counts: readonly number[],
  revealed: ReadonlySet<number>,
  flagged: ReadonlySet<number>,
  level: Level,
  showAll: boolean,
): string {
  const lines: string[] = [];
  for (let row = 0; row < level.rows; row += 1) {
    const cells: string[] = [];
    for (let col = 0; col < level.cols; col += 1) {
      const index = row * level.cols + col;
      if (showAll && mines.has(index)) cells.push("💣");
      else if (flagged.has(index)) cells.push("🚩");
      else if (revealed.has(index)) cells.push(counts[index] === 0 ? "·" : String(counts[index]));
      else cells.push("■");
    }
    lines.push(cells.join(" "));
  }
  return lines.join("\n");
}

export default createCommand(
  {
    name: "minesweeper",
    description:
      "Generate a first-click-safe minefield and run real constraint-based logic to clear it.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const difficulty = (context.args.positional[0] ?? "easy").toLowerCase();
      const level = LEVELS[difficulty];
      if (level === undefined)
        return {
          text: "❌ Choose a difficulty: `!minesweeper easy`, `!minesweeper medium` or `!minesweeper hard`.",
        };
      const total = level.rows * level.cols;
      const firstClick = Math.floor(level.rows / 2) * level.cols + Math.floor(level.cols / 2);
      const { mines, counts } = buildField(level, firstClick);
      const revealed = new Set<number>();
      const flagged = new Set<number>();
      const queue: number[] = [firstClick];
      while (queue.length > 0) {
        const index = queue.shift()!;
        if (revealed.has(index)) continue;
        revealed.add(index);
        if (counts[index] === 0) {
          for (const neighbour of neighbours(index, level.rows, level.cols)) {
            if (!revealed.has(neighbour) && !flagged.has(neighbour)) queue.push(neighbour);
          }
        }
      }
      let changed = true;
      let steps = 0;
      while (changed && steps < 500) {
        changed = false;
        steps += 1;
        for (const index of [...revealed]) {
          const count = counts[index]!;
          if (count === 0) continue;
          const around = neighbours(index, level.rows, level.cols);
          const hidden = around.filter((cell) => !revealed.has(cell) && !flagged.has(cell));
          const flags = around.filter((cell) => flagged.has(cell)).length;
          if (hidden.length === 0) continue;
          if (flags === count) {
            for (const cell of hidden) revealed.add(cell);
            changed = true;
          } else if (hidden.length === count - flags) {
            for (const cell of hidden) flagged.add(cell);
            changed = true;
          }
        }
      }
      const safeTotal = total - level.mines;
      const solved = revealed.size === safeTotal;
      const incorrectFlags = [...flagged].filter((index) => !mines.has(index)).length;
      const status =
        solved && incorrectFlags === 0
          ? `🎉 Cleared the field in ${formatInteger(steps)} deduction passes`
          : `⏸️ Logic revealed ${formatInteger(revealed.size)}/${formatInteger(safeTotal)} safe cells — stuck, needs a guess`;
      return {
        text: `💣 **Minesweeper (${difficulty})** — ${status}\n\n${render(mines, counts, revealed, flagged, level, solved)}\n\nGrid: ${formatInteger(level.rows)}×${formatInteger(level.cols)} · Mines: ${formatInteger(level.mines)} · Flagged: ${formatInteger(flagged.size)} · Wrong flags: ${formatInteger(incorrectFlags)}\nThe first click is always safe (its neighbours are mined-free).`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!minesweeper [easy|medium|hard]", "!minesweeper hard"],
    examples: ["!minesweeper", "!minesweeper medium", "!minesweeper hard"],
    permission: "public",
    cooldownMs: 3000,
  },
);
