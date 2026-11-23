import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, shuffle } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

type Piece = 0 | 1 | 2;
type Board = Piece[][];

const ROWS = 6;
const COLS = 7;

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0 as Piece));
}

function clone(board: Board): Board {
  return board.map((row) => [...row]);
}

function drop(board: Board, column: number, piece: Piece): number {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row]![column] === 0) {
      board[row]![column] = piece;
      return row;
    }
  }
  return -1;
}

function connectFour(board: Board, piece: Piece): boolean {
  const directions: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row]![col] !== piece) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let step = 1; step < 4; step += 1) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r]![c] !== piece) break;
          count += 1;
        }
        if (count >= 4) return true;
      }
    }
  }
  return false;
}

function available(board: Board): number[] {
  const result: number[] = [];
  for (let col = 0; col < COLS; col += 1) if (board[0]![col] === 0) result.push(col);
  return result;
}

function botColumn(board: Board): number {
  const options = shuffle(available(board));
  for (const column of options) {
    const trial = clone(board);
    drop(trial, column, 2);
    if (connectFour(trial, 2)) return column;
  }
  for (const column of options) {
    const trial = clone(board);
    drop(trial, column, 1);
    if (connectFour(trial, 1)) return column;
  }
  const centerFirst = [...options].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
  return pickRandom(centerFirst.slice(0, Math.min(3, centerFirst.length)));
}

function render(board: Board): string {
  const lines: string[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    lines.push(board[row]!.map((cell) => (cell === 1 ? "🔴" : cell === 2 ? "🟡" : "⚪")).join(""));
  }
  lines.push("1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣");
  return lines.join("\n");
}

export default createCommand(
  {
    name: "connect4",
    description:
      "Play Connect Four by listing column drops; the bot blocks wins and takes winning drops.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const moves = context.args.positional;
      if (moves.length === 0) {
        return {
          text: "❌ **Connect 4**\nUsage: `!connect4 <columns...>` (columns 1–7, left to right).\nExample: `!connect4 4 3 4 3 5 4 5`\nYou drop 🔴, the bot drops 🟡. Four in a row wins.",
        };
      }
      const board = emptyBoard();
      const log: string[] = [];
      let outcome = "";
      for (const raw of moves) {
        const column = Number(raw) - 1;
        if (!Number.isInteger(column) || column < 0 || column >= COLS) {
          return { text: `❌ "${raw}" is not a valid column (1–${formatInteger(COLS)}).` };
        }
        if (outcome !== "") break;
        const row = drop(board, column, 1);
        if (row === -1)
          return {
            text: `❌ Column ${formatInteger(column + 1)} is already full. Choose another column.`,
          };
        log.push(`You dropped in column ${formatInteger(column + 1)}.`);
        if (connectFour(board, 1)) {
          outcome = "🎉 You connected four!";
          break;
        }
        if (available(board).length === 0) {
          outcome = "🤝 Board full — draw.";
          break;
        }
        const bot = botColumn(board);
        drop(board, bot, 2);
        log.push(`Bot dropped in column ${formatInteger(bot + 1)}.`);
        if (connectFour(board, 2)) {
          outcome = "🤖 Bot connected four.";
          break;
        }
        if (available(board).length === 0) {
          outcome = "🤝 Board full — draw.";
          break;
        }
      }
      if (outcome === "") outcome = "⏸️ Game in progress — add more columns to keep playing.";
      return { text: `🎮 **Connect 4** — ${outcome}\n\n${render(board)}\n\n${log.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!connect4 <column> <column> ...", "!connect4 4 3 4 3 5"],
    examples: ["!connect4", "!connect4 4 4 5 3 6"],
    permission: "public",
    cooldownMs: 2000,
  },
);
