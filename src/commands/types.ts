import type { AppConfig } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import type { Services } from "../services/container.js";
import type { MessengerGateway } from "../messenger/client.js";
import type { DatabaseBundle } from "../databases/index.js";

export type CommandCategory =
  | "administration"
  | "moderation"
  | "information"
  | "utility"
  | "automation"
  | "entertainment"
  | "economy"
  | "leveling"
  | "games"
  | "media"
  | "ai";

export type PermissionLevel = "public" | "admin" | "owner";

export interface ParsedArguments {
  readonly name: string;
  readonly positional: readonly string[];
  readonly named: Readonly<Record<string, string>>;
  readonly raw: string;
}

export interface CommandContext {
  readonly command: CommandDefinition;
  readonly args: ParsedArguments;
  readonly senderId: string;
  readonly threadId: string;
  readonly threadName: string | null;
  readonly isGroup: boolean;
  readonly messageId: string;
  readonly eventTimestamp: number;
  readonly isReply: boolean;
  readonly config: AppConfig;
  readonly databases: DatabaseBundle;
  readonly services: Services;
  readonly messenger: MessengerGateway;
  readonly logger: AppLogger;
  reply(text: string): Promise<void>;
  react(emoji: string): Promise<void>;
}

export interface CommandResult {
  readonly text?: string;
  readonly silent?: boolean;
  readonly reactions?: readonly string[];
}

export interface CommandDefinition {
  readonly name: string;
  readonly description: string;
  readonly category: CommandCategory;
  readonly aliases: readonly string[];
  readonly usage: readonly string[];
  readonly examples: readonly string[];
  readonly permission: PermissionLevel;
  readonly cooldownMs: number;
  readonly maintenanceSafe: boolean;
  readonly module?: keyof AppConfig["modules"];
  run(context: CommandContext): Promise<CommandResult>;
}

export function defineCommand(definition: CommandDefinition): CommandDefinition {
  return definition;
}

export interface CommandDefaults {
  aliases?: readonly string[];
  usage?: readonly string[];
  examples?: readonly string[];
  permission?: PermissionLevel;
  cooldownMs?: number;
  maintenanceSafe?: boolean;
  module?: keyof AppConfig["modules"];
}

export function createCommand(
  base: Pick<CommandDefinition, "name" | "description" | "category" | "run">,
  defaults: CommandDefaults = {},
): CommandDefinition {
  return {
    aliases: [],
    usage: [],
    examples: [],
    permission: "public",
    cooldownMs: 0,
    maintenanceSafe: false,
    ...base,
    ...defaults,
  };
}
