import "dotenv/config";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { configSchema, formatConfigIssues } from "../src/config/index.js";
import {
  CommandRegistry,
  EXPECTED_COMMAND_COUNTS,
  EXPECTED_TOTAL_COMMANDS,
} from "../src/commands/registry.js";
import type { CommandCategory, CommandDefinition } from "../src/commands/types.js";

const CATEGORY_DIRECTORY = path.resolve(process.cwd(), "src", "commands", "categories");

function isCommandDefinition(value: unknown): value is CommandDefinition {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.run === "function"
  );
}

/** Walks exports, arrays and small wrapper objects to find command definitions. */
function collect(value: unknown, found: Map<string, CommandDefinition>, depth = 0): void {
  if (isCommandDefinition(value)) {
    found.set(value.name, value);
    return;
  }
  if (depth >= 2 || value === null || typeof value !== "object") return;
  for (const item of Object.values(value)) collect(item, found, depth + 1);
}

function extractCommands(module: Record<string, unknown>): CommandDefinition[] {
  const found = new Map<string, CommandDefinition>();
  for (const value of Object.values(module)) collect(value, found);
  return [...found.values()];
}

async function main(): Promise<void> {
  // Validate the configuration file directly; this check must run without
  // requiring credentials or a live database.
  const configResult = configSchema.safeParse(
    JSON.parse(readFileSync(path.resolve(process.cwd(), "config.json"), "utf8")) as unknown,
  );
  if (!configResult.success) {
    throw new Error(
      `Configuration validation failed:\n- ${formatConfigIssues(configResult.error).join("\n- ")}`,
    );
  }

  if (!existsSync(CATEGORY_DIRECTORY)) {
    throw new Error(
      `Missing command category directory: ${CATEGORY_DIRECTORY}. Expected src/commands/categories/<category>/index.ts.`,
    );
  }

  const registry = new CommandRegistry();
  const categories = Object.keys(EXPECTED_COMMAND_COUNTS) as CommandCategory[];
  const problems: string[] = [];
  const loaded = new Map<CommandCategory, number>();

  for (const category of categories) {
    const entry = path.join(CATEGORY_DIRECTORY, category, "index.ts");
    if (!existsSync(entry)) {
      problems.push(`Missing category index: src/commands/categories/${category}/index.ts`);
      continue;
    }
    try {
      const module = (await import(pathToFileURL(entry).href)) as Record<string, unknown>;
      const commands = extractCommands(module);
      loaded.set(category, commands.length);
      for (const command of commands) {
        try {
          registry.register(command);
        } catch (error) {
          problems.push(`${category}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      problems.push(
        `Cannot load ${category}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(`Command registry: ${registry.size}/${EXPECTED_TOTAL_COMMANDS}`);
  for (const category of categories) {
    const expected = EXPECTED_COMMAND_COUNTS[category];
    const actual = registry.byCategory(category).length;
    const imported = loaded.get(category);
    const suffix = imported === undefined ? "not loaded" : `imported ${imported}`;
    console.log(
      `  ${category.padEnd(15)} ${String(actual).padStart(3)}/${String(expected).padEnd(3)} (${suffix})`,
    );
  }

  try {
    registry.validate();
    console.log("Command registry validation passed.");
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }

  // readdirSync is used only to surface stray category folders that are not in
  // the expected set, so a directory can never be silently skipped.
  const unexpected = readdirSync(CATEGORY_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !categories.includes(entry.name as CommandCategory))
    .map((entry) => entry.name);
  if (unexpected.length > 0) problems.push(`Unexpected category folders: ${unexpected.join(", ")}`);

  if (problems.length > 0) {
    console.error("Command verification failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
