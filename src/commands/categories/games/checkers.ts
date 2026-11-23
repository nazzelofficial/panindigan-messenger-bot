import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface MoveResult {
  readonly board: string[];
  readonly captured: number;
}

function blank(): string[] {
  return Array.from({ length: 64 }, (_, index) =>
    (Math.floor(index / 8) + (index % 8)) % 2 === 1 ? "." : " ",
  );
}

function startingBoard(): string[] {
  const board = blank();
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const index = row * 8 + col;
      if (board[index] === " ") continue;
      if (row <= 2) board[index] = "b";
      if (row >= 5) board[index] = "w";
    }
  }
  return board;
}

function isWhite(piece: string): boolean {
  return piece.toLowerCase() === "w";
}

function promote(board: string[], row: number, col: number): string[] {
  const index = row * 8 + col;
  const piece = board[index]!;
  if (piece === "w" && row === 0) board[index] = "W";
  if (piece === "b" && row === 7) board[index] = "B";
  return board;
}

function capturePaths(board: string[], row: number, col: number, piece: string): MoveResult[] {
  const results: MoveResult[] = [];
  const king = piece === "W" || piece === "B";
  const directions = king ? [-1, 1] : [piece === "w" ? -1 : 1];
  for (const dr of directions) {
    for (const dc of [-1, 1]) {
      const middleRow = row + dr;
      const middleCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;
      if (middleRow < 0 || middleRow >= 8 || middleCol < 0 || middleCol >= 8) continue;
      if (landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) continue;
      const middle = board[middleRow * 8 + middleCol]!;
      const landing = board[landRow * 8 + landCol]!;
      if (middle === "." || middle === " " || landing !== "." || isWhite(middle) === isWhite(piece))
        continue;
      const next = [...board];
      next[row * 8 + col] = ".";
      next[middleRow * 8 + middleCol] = ".";
      next[landRow * 8 + landCol] = piece;
      promote(next, landRow, landCol);
      const landedPiece = next[landRow * 8 + landCol]!;
      const further = capturePaths(next, landRow, landCol, landedPiece);
      if (further.length === 0) results.push({ board: next, captured: 1 });
      else
        for (const path of further)
          results.push({ board: path.board, captured: path.captured + 1 });
    }
  }
  return results;
}

function allMoves(board: string[], white: boolean): MoveResult[] {
  const captures: MoveResult[] = [];
  const simple: MoveResult[] = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row * 8 + col]!;
      if (piece === "." || piece === " " || isWhite(piece) !== white) continue;
      captures.push(...capturePaths(board, row, col, piece));
      if (captures.length > 0) continue;
      const king = piece === "W" || piece === "B";
      const directions = king ? [-1, 1] : [piece === "w" ? -1 : 1];
      for (const dr of directions) {
        for (const dc of [-1, 1]) {
          const targetRow = row + dr;
          const targetCol = col + dc;
          if (targetRow < 0 || targetRow >= 8 || targetCol < 0 || targetCol >= 8) continue;
          if (board[targetRow * 8 + targetCol] !== ".") continue;
          const next = [...board];
          next[row * 8 + col] = ".";
          next[targetRow * 8 + targetCol] = piece;
          simple.push({ board: promote(next, targetRow, targetCol), captured: 0 });
        }
      }
    }
  }
  return captures.length > 0 ? captures : simple;
}

function count(board: readonly string[], white: boolean): { men: number; kings: number } {
  let men = 0;
  let kings = 0;
  for (const piece of board) {
    if (piece === "." || piece === " ") continue;
    if (isWhite(piece) !== white) continue;
    if (piece === piece.toUpperCase()) kings += 1;
    else men += 1;
  }
  return { men, kings };
}

function render(board: readonly string[]): string {
  const lines: string[] = ["  a b c d e f g h"];
  for (let row = 0; row < 8; row += 1) {
    lines.push(`${formatInteger(8 - row)} ${board.slice(row * 8, row * 8 + 8).join(" ")}`);
  }
  return lines.join("\n");
}

export default createCommand(
  {
    name: "checkers",
    description:
      "Simulate a game of American checkers with mandatory captures, multi-jumps and king promotion.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0];
      let plies = 24;
      if (requested !== undefined) {
        const parsed = Number(requested);
        if (!Number.isInteger(parsed) || parsed < 4 || parsed > 100) {
          return {
            text: "❌ Provide a whole number of plies between 4 and 100, e.g. `!checkers 30`.",
          };
        }
        plies = parsed;
      }
      let board = startingBoard();
      let whiteTurn = true;
      let totalCaptured = 0;
      const log: string[] = [];
      let status = `Simulated ${formatInteger(plies)} plies.`;
      for (let ply = 0; ply < plies; ply += 1) {
        const moves = allMoves(board, whiteTurn);
        if (moves.length === 0) {
          status = `No legal moves — ${whiteTurn ? "White" : "Black"} loses.`;
          break;
        }
        const chosen = pickRandom(moves);
        board = chosen.board;
        totalCaptured += chosen.captured;
        if (chosen.captured > 0)
          log.push(`${whiteTurn ? "White" : "Black"} captured ${formatInteger(chosen.captured)}.`);
        whiteTurn = !whiteTurn;
      }
      const whites = count(board, true);
      const blacks = count(board, false);
      return {
        text: `🔴 **Checkers** — ${status}\n\n${render(board)}\n\nWhite: ${formatInteger(whites.men)} men, ${formatInteger(whites.kings)} kings\nBlack: ${formatInteger(blacks.men)} men, ${formatInteger(blacks.kings)} kings\nTotal captures: ${formatInteger(totalCaptured)}\n${log.join(" ") || "No captures yet."}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!checkers [plies]", "!checkers 30"],
    examples: ["!checkers", "!checkers 50"],
    permission: "public",
    cooldownMs: 3000,
  },
);
