import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return { patched: false, reason: "missing" };

  const before = fs.readFileSync(filePath, "utf8");
  const after = before
    .replaceAll('"buffer/"', '"buffer"')
    .replaceAll("'buffer/'", "'buffer'");

  if (after === before) return { patched: false, reason: "no-change" };

  fs.writeFileSync(filePath, after, "utf8");
  return { patched: true };
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const targets = [
    path.join(repoRoot, "node_modules", "nsfwjs", "dist", "esm", "index.js"),
    path.join(repoRoot, "node_modules", "nsfwjs", "dist", "cjs", "index.js"),
  ];

  const results = targets.map((t) => ({ file: t, ...patchFile(t) }));
  const patchedCount = results.filter((r) => r.patched).length;

  // Non-fatal: if nsfwjs isn't installed in this environment yet, don't fail the install.
  if (patchedCount === 0) {
    const hasAny = results.some((r) => r.reason !== "missing");
    if (!hasAny) {
      console.log("[postinstall] nsfwjs not present yet; skipping buffer/ patch");
      return;
    }
  }

  for (const r of results) {
    if (r.patched) console.log(`[postinstall] patched: ${r.file}`);
  }
}

main();

