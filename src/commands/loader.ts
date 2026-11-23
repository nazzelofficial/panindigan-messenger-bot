import type { AppConfig } from "../config/index.js";
import type { CommandDefinition } from "./types.js";
import { CommandRegistry } from "./registry.js";
import { administrationCommands } from "./categories/administration/index.js";
import { moderationCommands } from "./categories/moderation/index.js";
import { informationCommands } from "./categories/information/index.js";
import { utilityCommands } from "./categories/utility/index.js";
import { automationCommands } from "./categories/automation/index.js";
import { entertainmentCommands } from "./categories/entertainment/index.js";
import { economyCommands } from "./categories/economy/index.js";
import { levelingCommands } from "./categories/leveling/index.js";
import { gamesCommands } from "./categories/games/index.js";
import { mediaCommands } from "./categories/media/index.js";
import { aiCommands } from "./categories/ai/index.js";

/**
 * Loads every command definition. Module switches are enforced at dispatch
 * time so the registry can always be validated against the exact 280-command
 * contract, independent of deployment configuration.
 */
export function loadAllCommands(_config?: AppConfig): CommandDefinition[] {
  return [
    ...administrationCommands,
    ...moderationCommands,
    ...informationCommands,
    ...utilityCommands,
    ...automationCommands,
    ...entertainmentCommands,
    ...economyCommands,
    ...levelingCommands,
    ...gamesCommands,
    ...mediaCommands,
    ...aiCommands,
  ];
}

export function createValidatedRegistry(config?: AppConfig): CommandRegistry {
  const registry = new CommandRegistry();
  for (const command of loadAllCommands(config)) registry.register(command);
  registry.validate();
  return registry;
}
