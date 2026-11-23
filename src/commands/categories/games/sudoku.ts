import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { shuffle } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

type Grid = number[][];

function baseValue(row: number, col: number): number {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function generateSolved(): Grid {
  const digits = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const rowOrder: number[] = [];
  const colOrder: number[] = [];
  for (const band of shuffle([0, 1, 2]))
    for (const within of shuffle([0, 1, 2])) rowOrder.push(band * 3 + within);
  for (const stack of shuffle([0, 1, 2]))
    for (const within of shuffle([0, 1, 2])) colOrder.push(stack * 3 + within);
  return rowOrder.map((row) => colOrder.map((col) => digits[baseValue(row, col)]! + 1));
}

function clone(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function valid(grid: Grid, row: number, col: number, value: number): boolean {
  for (let index = 0; index < 9; index += 1) {
    if (grid[row]![index] === value && index !== col) return false;
    if (grid[index]![col] === value && index !== row) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (grid[r]![c] === value && (r !== row || c !== col)) return false;
    }
  }
  return true;
}

function solve(grid: Grid): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row]![col] !== 0) continue;
      for (let value = 1; value <= 9; value += 1) {
        if (!valid(grid, row, col, value)) continue;
        grid[row]![col] = value;
        if (solve(grid)) return true;
        grid[row]![col] = 0;
      }
      return false;
    }
  }
  return true;
}

function makePuzzle(solution: Grid, clues: number): Grid {
  const puzzle = clone(solution);
  let remaining = 81;
  const order = shuffle(Array.from({ length: 81 }, (_, index) => index));
  for (const index of order) {
    if (remaining <= clues) break;
    const row = Math.floor(index / 9);
    const col = index % 9;
    const mirror = 80 - index;
    const mirrorRow = Math.floor(mirror / 9);
    const mirrorCol = mirror % 9;
    if (puzzle[row]![col] !== 0) {
      puzzle[row]![col] = 0;
      remaining -= 1;
    }
    if (row !== mirrorRow || col !== mirrorCol) {
      if (puzzle[mirrorRow]![mirrorCol] !== 0 && remaining > clues) {
        puzzle[mirrorRow]![mirrorCol] = 0;
        remaining -= 1;
      }
    }
  }
  return puzzle;
}

function render(grid: Grid): string {
  const lines: string[] = [];
  for (let row = 0; row < 9; row += 1) {
    if (row > 0 && row % 3 === 0) lines.push("───────┼───────┼───────");
    const cells: string[] = [];
    for (let col = 0; col < 9; col += 1) {
      if (col === 3 || col === 6) cells.push("│");
      cells.push(grid[row]![col] === 0 ? "." : String(grid[row]![col]));
    }
    lines.push(cells.join(" "));
  }
  return lines.join("\n");
}

export default createCommand(
  {
    name: "sudoku",
    description:
      "Generate a genuine Sudoku puzzle from a transformed solution grid and verify submitted solutions.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const difficulty = (context.args.positional[0] ?? "medium").toLowerCase();
      const clues = difficulty === "easy" ? 50 : difficulty === "hard" ? 28 : 40;
      if (!["easy", "medium", "hard", "solve", "answer"].includes(difficulty)) {
        return {
          text: "❌ Use `!sudoku`, `!sudoku easy|medium|hard`, `!sudoku answer` or `!sudoku solve <81 digits>`.",
        };
      }
      const solution = generateSolved();
      const checked = clone(solution);
      if (!solve(checked)) return { text: "❌ Internal error — generated grid has no solution." };
      const puzzle = makePuzzle(solution, clues);
      if (difficulty === "answer") {
        return { text: `✅ **Sudoku Solution**\n\n${render(checked)}` };
      }
      if (difficulty === "solve") {
        const raw = context.args.positional[1];
        if (raw === undefined || !/^[0-9]{81}$/.test(raw)) {
          return {
            text: "❌ Provide all 81 digits: `!sudoku solve 530070000600195000098000060...` (0 = blank).",
          };
        }
        const attempt: Grid = Array.from({ length: 9 }, (_, row) =>
          Array.from({ length: 9 }, (_, col) => Number(raw[row * 9 + col])),
        );
        for (let row = 0; row < 9; row += 1) {
          for (let col = 0; col < 9; col += 1) {
            if (puzzle[row]![col] !== 0 && attempt[row]![col] !== puzzle[row]![col]) {
              return {
                text: `❌ Cell R${row + 1}C${col + 1} changes a given clue — it must stay ${puzzle[row]![col]}.`,
              };
            }
          }
        }
        let errors = 0;
        for (let row = 0; row < 9; row += 1) {
          for (let col = 0; col < 9; col += 1) {
            const value = attempt[row]![col]!;
            if (value < 1 || value > 9 || !valid(attempt, row, col, value)) errors += 1;
          }
        }
        if (errors > 0)
          return {
            text: `❌ Solution rejected: ${formatInteger(errors)} cell(s) violate Sudoku rules (duplicates in a row, column or 3×3 box, or blanks).`,
          };
        const solvedCorrectly = attempt.every((row, r) =>
          row.every((value, c) => value === checked[r]![c]),
        );
        return {
          text: solvedCorrectly
            ? "🎉 **Sudoku solved correctly!** Every row, column and box is valid and matches the unique solution."
            : "⚠️ The grid follows Sudoku rules but does not match this puzzle's unique solution — check a few cells.",
        };
      }
      const blanks = puzzle.flat().filter((cell) => cell === 0).length;
      return {
        text: `🔢 **Sudoku (${difficulty})** — ${formatInteger(81 - blanks)} clues, ${formatInteger(blanks)} blanks.\n\n${render(puzzle)}\n\nSubmit: \`!sudoku solve <81 digits>\` where 0 marks a blank. Use \`!sudoku answer\` to reveal the computed solution.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!sudoku [easy|medium|hard]", "!sudoku solve <81 digits>", "!sudoku answer"],
    examples: ["!sudoku", "!sudoku hard", "!sudoku answer"],
    permission: "public",
    cooldownMs: 3000,
  },
);
