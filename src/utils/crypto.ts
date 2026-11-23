import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomIdentifier(prefix = "pm"): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function randomInt(minimumInclusive: number, maximumInclusive: number): number {
  if (maximumInclusive < minimumInclusive) {
    throw new Error("Maximum must be greater than or equal to minimum.");
  }
  const span = maximumInclusive - minimumInclusive + 1;
  return minimumInclusive + (randomBytes(4).readUInt32BE(0) % span);
}

export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("Cannot pick from an empty collection.");
  return items[randomInt(0, items.length - 1)]!;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = randomInt(0, index);
    const current = result[index]!;
    result[index] = result[swap]!;
    result[swap] = current;
  }
  return result;
}
