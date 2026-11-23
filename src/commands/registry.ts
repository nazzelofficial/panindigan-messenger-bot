import type { CommandCategory, CommandDefinition } from "./types.js";

export const EXPECTED_COMMAND_COUNTS: Readonly<Record<CommandCategory, number>> = {
  administration: 35,
  moderation: 25,
  information: 25,
  utility: 25,
  automation: 25,
  entertainment: 25,
  economy: 30,
  leveling: 25,
  games: 25,
  media: 25,
  ai: 15,
};

export const EXPECTED_TOTAL_COMMANDS = 280;

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly aliases = new Map<string, string>();

  public register(command: CommandDefinition): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Duplicate command name: ${command.name}`);
    }
    this.commands.set(command.name, command);
    for (const alias of command.aliases) {
      if (this.aliases.has(alias) || this.commands.has(alias)) {
        throw new Error(`Duplicate command alias: ${alias}`);
      }
      this.aliases.set(alias, command.name);
    }
  }

  public resolve(name: string): CommandDefinition | undefined {
    const canonical = this.aliases.get(name) ?? name;
    return this.commands.get(canonical);
  }

  public get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  public get size(): number {
    return this.commands.size;
  }

  public all(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  public byCategory(category: CommandCategory): CommandDefinition[] {
    return this.all().filter((command) => command.category === category);
  }

  /** Fails startup on missing, duplicated or unexpectedly registered commands. */
  public validate(): void {
    const problems: string[] = [];
    if (this.size !== EXPECTED_TOTAL_COMMANDS) {
      problems.push(`Expected ${EXPECTED_TOTAL_COMMANDS} commands, found ${this.size}.`);
    }
    for (const [category, expected] of Object.entries(EXPECTED_COMMAND_COUNTS)) {
      const actual = this.byCategory(category as CommandCategory).length;
      if (actual !== expected) {
        problems.push(`Category ${category}: expected ${expected}, found ${actual}.`);
      }
    }
    if (
      this.aliases.size !== 0 &&
      [...this.aliases.keys()].some((alias) => this.commands.has(alias))
    ) {
      problems.push("An alias collides with a canonical command name.");
    }
    if (problems.length > 0) {
      throw new Error(`Command registry validation failed:\n- ${problems.join("\n- ")}`);
    }
  }
}
