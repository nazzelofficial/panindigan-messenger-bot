import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

type Cell = 0 | 1 | 2;

const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(board: readonly Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    const first = board[a]!;
    if (first !== 0 && first === board[b]! && first === board[c]!) return first;
  }
  return 0;
}

function full(board: readonly Cell[]): boolean {
  return board.every((cell) => cell !== 0);
}

function minimax(board: Cell[], turn: Cell, depth: number): number {
  const won = winner(board);
  if (won === 2) return 10 - depth;
  if (won === 1) return depth - 10;
  if (full(board)) return 0;
  let best = turn === 2 ? -Infinity : Infinity;
  for (let index = 0; index < 9; index += 1) {
    if (board[index] !== 0) continue;
    board[index] = turn;
    const score = minimax(board, turn === 2 ? 1 : 2, depth + 1);
    board[index] = 0;
    best = turn === 2 ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function bestMove(board: Cell[]): number {
  const options: Array<{ move: number; score: number }> = [];
  for (let index = 0; index < 9; index += 1) {
    if (board[index] !== 0) continue;
    board[index] = 2;
    const score = minimax(board, 1, 1);
    board[index] = 0;
    options.push({ move: index, score });
  }
  if (options.length === 0) return -1;
  const highest = Math.max(...options.map((option) => option.score));
  return pickRandom(options.filter((option) => option.score === highest)).move;
}

function render(board: readonly Cell[]): string {
  const rows: string[] = [];
  for (let row = 0; row < 3; row += 1) {
    const cells: string[] = [];
    for (let col = 0; col < 3; col += 1) {
      const value = board[row * 3 + col]!;
      cells.push(value === 1 ? "X" : value === 2 ? "O" : String(row * 3 + col + 1));
    }
    rows.push(cells.join("│"));
  }
  return `${rows[0]}\n──┼─ ─┼──\n${rows[1]}\n──┼─ ─┼──\n${rows[2]}`;
}

export default createCommand(
  {
    name: "tic-tac-toe",
    description:
      "Play a full game of tic-tac-toe against an unbeatable minimax opponent by listing your cell choices.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const moves = context.args.positional;
      if (moves.length === 0) {
        return {
          text: "❌ **Tic-Tac-Toe**\nUsage: `!tic-tac-toe <cells...>` where cells are numbers 1–9 (row-major).\nExample: `!tic-tac-toe 1 5 9 3`\nYou play X, the bot plays O and never loses.",
        };
      }
      const board: Cell[] = Array.from({ length: 9 }, () => 0);
      const parsed: number[] = [];
      for (const move of moves) {
        const cell = Number(move);
        if (!Number.isInteger(cell) || cell < 1 || cell > 9) {
          return { text: `❌ "${move}" is not a cell number from 1 to 9.` };
        }
        parsed.push(cell - 1);
      }
      const log: string[] = [];
      let result = "";
      for (const move of parsed) {
        if (board[move] !== 0) {
          return {
            text: `❌ Cell ${formatInteger(move + 1)} was already played. Occupied cells cannot be reused.`,
          };
        }
        if (winner(board) !== 0 || full(board)) break;
        board[move] = 1;
        log.push(`You took ${formatInteger(move + 1)}.`);
        if (winner(board) === 1) {
          result = "🎉 You win!";
          break;
        }
        if (full(board)) {
          result = "🤝 Draw.";
          break;
        }
        const reply = bestMove(board);
        if (reply === -1) break;
        board[reply] = 2;
        log.push(`Bot took ${formatInteger(reply + 1)}.`);
        if (winner(board) === 2) {
          result = "🤖 Bot wins.";
          break;
        }
        if (full(board)) {
          result = "🤝 Draw.";
          break;
        }
      }
      if (result === "" && winner(board) === 0 && !full(board))
        result = "⏸️ Game paused — supply more cell numbers to continue.";
      if (result === "" && winner(board) === 1) result = "🎉 You win!";
      if (result === "" && winner(board) === 2) result = "🤖 Bot wins.";
      return { text: `🎮 **Tic-Tac-Toe** — ${result}\n\n${render(board)}\n\n${log.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!tic-tac-toe <cell> <cell> ...", "!tic-tac-toe 1 5 9 3"],
    examples: ["!tic-tac-toe", "!tic-tac-toe 5 1 9 3"],
    permission: "public",
    cooldownMs: 2000,
  },
);
