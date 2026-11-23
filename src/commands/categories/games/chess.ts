import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const KNIGHT: ReadonlyArray<readonly [number, number]> = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const KING: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const BISHOP: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const ROOK: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const QUEEN: ReadonlyArray<readonly [number, number]> = [...BISHOP, ...ROOK];
const VALUE: Readonly<Record<string, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function isWhite(piece: string): boolean {
  return piece === piece.toUpperCase();
}

function startingBoard(): string[] {
  return [
    "rnbqkbnr",
    "pppppppp",
    "........",
    "........",
    "........",
    "........",
    "PPPPPPPP",
    "RNBQKBNR",
  ]
    .join("")
    .split("");
}

function pseudoMoves(board: string[], white: boolean): Array<readonly [number, number]> {
  const moves: Array<readonly [number, number]> = [];
  const canLand = (piece: string): boolean => piece === "." || isWhite(piece) !== white;
  for (let from = 0; from < 64; from += 1) {
    const piece = board[from]!;
    if (piece === "." || isWhite(piece) !== white) continue;
    const type = piece.toLowerCase();
    const row = Math.floor(from / 8);
    const col = from % 8;
    const add = (r: number, c: number): void => {
      if (r < 0 || r >= 8 || c < 0 || c >= 8) return;
      const to = r * 8 + c;
      if (canLand(board[to]!)) moves.push([from, to]);
    };
    if (type === "p") {
      const dir = white ? -1 : 1;
      const nextRow = row + dir;
      if (nextRow >= 0 && nextRow < 8 && board[nextRow * 8 + col] === ".") {
        add(nextRow, col);
        if (row === (white ? 6 : 1) && board[(row + 2 * dir) * 8 + col] === ".")
          add(row + 2 * dir, col);
      }
      for (const dc of [-1, 1]) {
        const captureCol = col + dc;
        if (captureCol < 0 || captureCol >= 8 || nextRow < 0 || nextRow >= 8) continue;
        const target = board[nextRow * 8 + captureCol]!;
        if (target !== "." && isWhite(target) !== white) add(nextRow, captureCol);
      }
    } else if (type === "n") {
      for (const [dr, dc] of KNIGHT) add(row + dr, col + dc);
    } else if (type === "k") {
      for (const [dr, dc] of KING) add(row + dr, col + dc);
    } else {
      const directions = type === "b" ? BISHOP : type === "r" ? ROOK : QUEEN;
      for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const target = board[r * 8 + c]!;
          if (target === ".") moves.push([from, r * 8 + c]);
          else {
            if (isWhite(target) !== white) moves.push([from, r * 8 + c]);
            break;
          }
          r += dr;
          c += dc;
        }
      }
    }
  }
  return moves;
}

function isAttacked(board: string[], square: number, byWhite: boolean): boolean {
  const row = Math.floor(square / 8);
  const col = square % 8;
  const owns = (piece: string): boolean => piece !== "." && isWhite(piece) === byWhite;
  const pawnRow = byWhite ? row + 1 : row - 1;
  if (pawnRow >= 0 && pawnRow < 8) {
    for (const dc of [-1, 1]) {
      const c = col + dc;
      if (c >= 0 && c < 8 && board[pawnRow * 8 + c] === (byWhite ? "P" : "p")) return true;
    }
  }
  for (const [dr, dc] of KNIGHT) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === (byWhite ? "N" : "n"))
      return true;
  }
  for (const [dr, dc] of KING) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === (byWhite ? "K" : "k"))
      return true;
  }
  for (const [dr, dc] of QUEEN) {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r * 8 + c]!;
      if (piece !== ".") {
        if (owns(piece)) {
          const type = piece.toLowerCase();
          const diagonal = dr !== 0 && dc !== 0;
          if (type === "q" || (diagonal && type === "b") || (!diagonal && type === "r"))
            return true;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

function inCheck(board: string[], white: boolean): boolean {
  const king = board.indexOf(white ? "K" : "k");
  if (king === -1) return true;
  return isAttacked(board, king, !white);
}

function applyMove(board: string[], from: number, to: number): string[] {
  const next = [...board];
  const piece = next[from]!;
  next[from] = ".";
  next[to] =
    piece.toLowerCase() === "p" && (to < 8 || to >= 56) ? (isWhite(piece) ? "Q" : "q") : piece;
  return next;
}

function legalMoves(board: string[], white: boolean): Array<readonly [number, number]> {
  return pseudoMoves(board, white).filter(
    ([from, to]) => !inCheck(applyMove(board, from, to), white),
  );
}

function material(board: readonly string[]): number {
  let score = 0;
  for (const piece of board) {
    if (piece === ".") continue;
    score += (isWhite(piece) ? 1 : -1) * (VALUE[piece.toLowerCase()] ?? 0);
  }
  return score;
}

function render(board: readonly string[]): string {
  const lines: string[] = [];
  for (let row = 0; row < 8; row += 1) {
    lines.push(`${formatInteger(8 - row)} ${board.slice(row * 8, row * 8 + 8).join(" ")}`);
  }
  lines.push("  a b c d e f g h");
  return lines.join("\n");
}

export default createCommand(
  {
    name: "chess",
    description:
      "Simulate a real chess game with full legal move generation and check detection from the standard opening position.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0];
      let plies = 16;
      if (requested !== undefined) {
        const parsed = Number(requested);
        if (!Number.isInteger(parsed) || parsed < 4 || parsed > 80) {
          return { text: "❌ Provide a whole number of plies between 4 and 80, e.g. `!chess 20`." };
        }
        plies = parsed;
      }
      let board = startingBoard();
      let whiteTurn = true;
      const log: string[] = [];
      let status = `Simulated ${formatInteger(plies)} plies.`;
      for (let ply = 0; ply < plies; ply += 1) {
        const moves = legalMoves(board, whiteTurn);
        if (moves.length === 0) {
          status = inCheck(board, whiteTurn)
            ? `Checkmate — ${whiteTurn ? "Black" : "White"} wins.`
            : "Stalemate — draw.";
          break;
        }
        const [from, to] = pickRandom(moves);
        const captured = board[to!] !== ".";
        const notation = `${board[from!]}${String.fromCharCode(97 + (from! % 8))}${formatInteger(8 - Math.floor(from! / 8))}→${String.fromCharCode(97 + (to! % 8))}${formatInteger(8 - Math.floor(to! / 8))}${captured ? "x" : ""}`;
        board = applyMove(board, from!, to!);
        log.push(notation);
        whiteTurn = !whiteTurn;
      }
      const advantage = material(board);
      const summary =
        advantage === 0
          ? "equal material"
          : `${advantage > 0 ? "White" : "Black"} ahead by ${formatInteger(Math.abs(advantage))}`;
      return {
        text: `♟️ **Chess** — ${status}\n\n${render(board)}\n\nMaterial: ${summary}.\nMoves: ${log.join(" ")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!chess [plies]", "!chess 24"],
    examples: ["!chess", "!chess 40"],
    permission: "public",
    cooldownMs: 3000,
  },
);
