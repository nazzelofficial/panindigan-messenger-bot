import type { AppConfig, ResolvedSecrets } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import type { DatabaseBundle } from "../databases/index.js";
import type { MessengerGateway } from "../messenger/client.js";
import { PermissionsService } from "./permissions/service.js";
import { CooldownService } from "./cooldown/service.js";
import { AntiSpamService } from "./anti-spam/service.js";
import { AlertService } from "./alerting/service.js";
import { EconomyService } from "./economy/service.js";
import { LevelingService } from "./leveling/service.js";
import { AutomationService } from "./automation/service.js";
import { ModerationService } from "./moderation/service.js";
import { MemoryCache } from "./cache/memory.js";
import type { RedisCache } from "../databases/redis/cache.js";
import type { UserRepository } from "../databases/postgresql/repositories/core.js";
import { AiService } from "./ai/service.js";
import { MaintenanceService } from "./maintenance/service.js";
import { AnnouncementService } from "./announcements/service.js";
import { SchedulerService } from "./scheduler/service.js";
import { EventProcessingService } from "./event-processing/service.js";

export class Services {
  public readonly users: UserRepository | undefined;
  public readonly cache: RedisCache | MemoryCache;
  public readonly permissions: PermissionsService;
  public readonly cooldowns: CooldownService;
  public readonly antiSpam: AntiSpamService;
  public readonly alerts: AlertService;
  public readonly economy: EconomyService;
  public readonly leveling: LevelingService;
  public readonly automation: AutomationService;
  public readonly moderation: ModerationService;
  public readonly ai: AiService;
  public readonly maintenance: MaintenanceService;
  public readonly announcements: AnnouncementService;
  public readonly scheduler: SchedulerService;
  public readonly events: EventProcessingService;

  public constructor(
    config: AppConfig,
    secrets: ResolvedSecrets,
    databases: DatabaseBundle,
    messenger: MessengerGateway,
    logger: AppLogger,
  ) {
    this.users = databases.users;
    this.cache = databases.cache ?? new MemoryCache(config.cache.maximumEntries);
    this.permissions = new PermissionsService(config, databases.users, databases.audit, logger);
    this.cooldowns = new CooldownService(config, databases);
    this.antiSpam = new AntiSpamService(config, databases, logger);
    this.alerts = new AlertService(config, secrets, logger);
    this.economy = new EconomyService(config, databases, this.cooldowns, logger);
    this.leveling = new LevelingService(databases.leveling, databases.users);
    this.automation = new AutomationService(databases.automation);
    this.moderation = new ModerationService(databases.moderation);
    this.ai = new AiService(config, secrets, databases, this.cooldowns, logger);
    this.maintenance = new MaintenanceService(config, databases, messenger, logger);
    this.announcements = new AnnouncementService(config, databases, messenger, logger);
    this.scheduler = new SchedulerService(config, databases, logger);
    this.events = new EventProcessingService(config, databases, this.automation, messenger, logger);
  }
}
