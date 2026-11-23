import { describe, expect, it } from "vitest";
import { loadAllCommands } from "../../src/commands/loader.js";
import {
  CommandRegistry,
  EXPECTED_COMMAND_COUNTS,
  EXPECTED_TOTAL_COMMANDS,
} from "../../src/commands/registry.js";
import { parseCommandBody } from "../../src/commands/parser.js";

describe("command registry", () => {
  const commands = loadAllCommands();
  it("registers exactly 280 commands", () => {
    expect(commands.length).toBe(280);
    const registry = new CommandRegistry();
    for (const command of commands) registry.register(command);
    expect(registry.size).toBe(EXPECTED_TOTAL_COMMANDS);
    expect(() => registry.validate()).not.toThrow();
  });

  it("matches every category count", () => {
    for (const [category, expected] of Object.entries(EXPECTED_COMMAND_COUNTS)) {
      expect(commands.filter((command) => command.category === category).length, category).toBe(
        expected,
      );
    }
  });

  it("has unique names, descriptions and no alias collisions", () => {
    const names = commands.map((command) => command.name);
    expect(new Set(names).size).toBe(names.length);
    const descriptions = commands.map((command) => command.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    const aliases = commands.flatMap((command) => command.aliases);
    expect(aliases.every((alias) => !names.includes(alias))).toBe(true);
  });

  it("resolves addmember aliases to one implementation", () => {
    const registry = new CommandRegistry();
    for (const command of commands) registry.register(command);
    const addmember = registry.resolve("addmember");
    expect(registry.resolve("add")).toBe(addmember);
    expect(registry.resolve("invite")).toBe(addmember);
  });

  it("rejects duplicate registration", () => {
    const registry = new CommandRegistry();
    registry.register(commands[0]!);
    expect(() => registry.register(commands[0]!)).toThrow(/Duplicate command name/);
  });
});

describe("command parser", () => {
  it("parses positional and named arguments", () => {
    const parsed = parseCommandBody(
      "!maintenance schedule 2026-12-01 22:00 --reason=upgrade",
      "!",
      true,
    );
    expect(parsed?.name).toBe("maintenance");
    expect(parsed?.positional).toEqual(["schedule", "2026-12-01", "22:00"]);
    expect(parsed?.named["reason"]).toBe("upgrade");
  });

  it("ignores bodies without the prefix", () => {
    expect(parseCommandBody("hello", "!", true)).toBeUndefined();
  });
});
