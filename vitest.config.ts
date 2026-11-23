import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * The source uses explicit `.js` specifiers so the compiled ESM output runs
 * unchanged on Node.js. During tests those specifiers must resolve back to the
 * `.ts` files that Vite transforms. This small resolver does exactly that and
 * nothing more.
 */
const typescriptSpecifiers = {
  name: "typescript-specifiers",
  enforce: "pre" as const,
  resolveId(source: string, importer: string | undefined) {
    if (!importer || !source.startsWith(".") || !/\.(js|mjs|cjs)$/.test(source)) {
      return null;
    }
    const target = path.resolve(path.dirname(importer), source);
    const typescriptTarget = target.replace(/\.(js|mjs|cjs)$/, ".ts");
    return existsSync(typescriptTarget) ? typescriptTarget : null;
  },
};

export default defineConfig({
  plugins: [typescriptSpecifiers],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 15000,
    hookTimeout: 15000,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
});
