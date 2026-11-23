import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Point {
  readonly row: number;
  readonly col: number;
}

const SIZE = 10;

function key(point: Point): string {
  return `${point.row},${point.col}`;
}

function emptyCells(body: readonly Point[]): Point[] {
  const occupied = new Set(body.map(key));
  const cells: Point[] = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!occupied.has(`${row},${col}`)) cells.push({ row, col });
    }
  }
  return cells;
}

function pathToFood(head: Point, food: Point, body: readonly Point[]): Point[] | null {
  const blocked = new Set(body.map(key));
  blocked.delete(key(body[body.length - 1]!));
  const queue: Point[] = [head];
  const previous = new Map<string, string | null>([[key(head), null]]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === food.row && current.col === food.col) {
      const path: Point[] = [];
      let cursor: string | null = key(current);
      while (cursor !== null && cursor !== key(head)) {
        const [row, col] = cursor.split(",").map(Number);
        path.push({ row: row!, col: col! });
        cursor = previous.get(cursor) ?? null;
      }
      return path.reverse();
    }
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const next = { row: current.row + dr, col: current.col + dc };
      if (next.row < 0 || next.row >= SIZE || next.col < 0 || next.col >= SIZE) continue;
      const nextKey = key(next);
      if (previous.has(nextKey)) continue;
      if (blocked.has(nextKey) && nextKey !== key(food)) continue;
      previous.set(nextKey, key(current));
      queue.push(next);
    }
  }
  return null;
}

function render(body: readonly Point[], food: Point): string {
  const lines: string[] = [];
  const head = body[0]!;
  for (let row = 0; row < SIZE; row += 1) {
    const cells: string[] = [];
    for (let col = 0; col < SIZE; col += 1) {
      if (row === food.row && col === food.col) cells.push("🍎");
      else if (row === head.row && col === head.col) cells.push("🟢");
      else if (body.some((point) => point.row === row && point.col === col)) cells.push("🟩");
      else cells.push("·");
    }
    lines.push(cells.join(" "));
  }
  return lines.join("\n");
}

export default createCommand(
  {
    name: "snake",
    description:
      "Run a genuine snake simulation where a BFS pathfinder steers the snake toward food without hitting walls or itself.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0];
      let maxSteps = 200;
      if (requested !== undefined) {
        const parsed = Number(requested);
        if (!Number.isInteger(parsed) || parsed < 20 || parsed > 600) {
          return { text: "❌ Provide a step limit from 20 to 600, e.g. `!snake 250`." };
        }
        maxSteps = parsed;
      }
      let body: Point[] = [
        { row: 5, col: 4 },
        { row: 5, col: 3 },
        { row: 5, col: 2 },
      ];
      let food = pickRandom(emptyCells(body));
      let score = 0;
      let steps = 0;
      let reason = `stopped after ${formatInteger(maxSteps)} steps`;
      while (steps < maxSteps && body.length < SIZE * SIZE) {
        const path = pathToFood(body[0]!, food, body);
        if (path === null || path.length === 0) {
          reason = " trapped — no safe path to the food";
          break;
        }
        const next = path[0]!;
        const eating = next.row === food.row && next.col === food.col;
        const grown = [next, ...body];
        if (!eating) grown.pop();
        if (grown.slice(1).some((point) => point.row === next.row && point.col === next.col)) {
          reason = " crashed into its own body";
          break;
        }
        body = grown;
        steps += 1;
        if (eating) {
          score += 1;
          const available = emptyCells(body);
          if (available.length === 0) {
            reason = " filled the entire board — perfect game";
            break;
          }
          food = pickRandom(available);
        }
      }
      if (body.length >= SIZE * SIZE) reason = " filled the entire board — perfect game";
      return {
        text: `🐍 **Snake** — the snake ${reason}.\n\n${render(body, food)}\n\nScore: ${formatInteger(score)} apples · Length: ${formatInteger(body.length)} · Steps: ${formatInteger(steps)}\nThe snake chose each move with a breadth-first search toward the food while avoiding walls and its body.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!snake [steps]", "!snake 250"],
    examples: ["!snake", "!snake 400"],
    permission: "public",
    cooldownMs: 3000,
  },
);
