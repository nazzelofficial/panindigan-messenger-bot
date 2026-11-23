import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const GOAL: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const GOAL_KEY = "123456780";
const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

interface Neighbour {
  readonly state: number[];
  readonly tile: number;
}

interface SearchNode {
  readonly state: number[];
  readonly g: number;
  readonly f: number;
  readonly parent: SearchNode | null;
  readonly tile: number;
}

function neighbours(state: readonly number[]): Neighbour[] {
  const blank = state.indexOf(0);
  const row = Math.floor(blank / 3);
  const col = blank % 3;
  const result: Neighbour[] = [];
  for (const [dr, dc] of OFFSETS) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= 3 || c < 0 || c >= 3) continue;
    const target = r * 3 + c;
    const next = [...state];
    next[blank] = next[target]!;
    next[target] = 0;
    result.push({ state: next, tile: state[target]! });
  }
  return result;
}

function heuristic(state: readonly number[]): number {
  let distance = 0;
  for (let index = 0; index < 9; index += 1) {
    const tile = state[index]!;
    if (tile === 0) continue;
    const target = tile - 1;
    distance +=
      Math.abs(Math.floor(index / 3) - Math.floor(target / 3)) +
      Math.abs((index % 3) - (target % 3));
  }
  return distance;
}

function solve(start: readonly number[]): { moves: number[]; expanded: number } | null {
  const startKey = start.join("");
  if (startKey === GOAL_KEY) return { moves: [], expanded: 0 };
  const open: SearchNode[] = [
    { state: [...start], g: 0, f: heuristic(start), parent: null, tile: 0 },
  ];
  const best = new Map<string, number>([[startKey, 0]]);
  let expanded = 0;
  while (open.length > 0) {
    open.sort((left, right) => left.f - right.f || left.g - right.g);
    const current = open.shift()!;
    if (current.state.join("") === GOAL_KEY) {
      const moves: number[] = [];
      let node: SearchNode | null = current;
      while (node !== null && node.parent !== null) {
        moves.push(node.tile);
        node = node.parent;
      }
      return { moves: moves.reverse(), expanded };
    }
    expanded += 1;
    for (const next of neighbours(current.state)) {
      const key = next.state.join("");
      const cost = current.g + 1;
      if ((best.get(key) ?? Infinity) <= cost) continue;
      best.set(key, cost);
      open.push({
        state: next.state,
        g: cost,
        f: cost + heuristic(next.state),
        parent: current,
        tile: next.tile,
      });
    }
  }
  return null;
}

function render(state: readonly number[]): string {
  const rows: string[] = [];
  for (let row = 0; row < 3; row += 1) {
    rows.push(
      state
        .slice(row * 3, row * 3 + 3)
        .map((tile) => (tile === 0 ? "⬛" : String(tile)))
        .join(" "),
    );
  }
  return rows.join("\n");
}

export default createCommand(
  {
    name: "puzzle",
    description:
      "Generate a solvable 8-puzzle by legal moves and compute an optimal A* solution with Manhattan distance.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0];
      let depth = 12;
      if (requested !== undefined) {
        const parsed = Number(requested);
        if (!Number.isInteger(parsed) || parsed < 5 || parsed > 26) {
          return {
            text: "❌ Scramble depth must be a whole number from 5 to 26, e.g. `!puzzle 12`.",
          };
        }
        depth = parsed;
      }
      let board: number[] = [...GOAL];
      let previousBlank = -1;
      for (let step = 0; step < depth; step += 1) {
        const options = neighbours(board).filter((option) => {
          const blank = board.indexOf(0);
          return option.state.indexOf(0) !== previousBlank || blank === previousBlank;
        });
        const choice = pickRandom(options.length > 0 ? options : neighbours(board));
        previousBlank = board.indexOf(0);
        board = choice.state;
      }
      const solution = solve(board);
      if (solution === null)
        return { text: "❌ Internal solver error — this board should be solvable." };
      const preview = solution.moves.slice(0, 12).join(" → ");
      return {
        text: `🧩 **8-Puzzle** — solved optimally in ${formatInteger(solution.moves.length)} moves.\n\n${render(board)}\n\nScramble: ${formatInteger(depth)} random legal slides\nA* nodes expanded: ${formatInteger(solution.expanded)}\nSolution (first ${formatInteger(Math.min(12, solution.moves.length))} tiles): ${preview}${solution.moves.length > 12 ? " → …" : ""}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!puzzle [depth]", "!puzzle 12"],
    examples: ["!puzzle", "!puzzle 20"],
    permission: "public",
    cooldownMs: 3000,
  },
);
