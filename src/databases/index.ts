import type { AppConfig, ResolvedSecrets } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import { PostgresClient } from "./postgresql/client.js";
import { PostgresMigrator } from "./postgresql/migrations.js";
import { TursoClient } from "./turso/client.js";
import { TursoMigrator } from "./turso/migrations.js";
import { MongoDatabase } from "./mongodb/client.js";
import { MongoMigrator } from "./mongodb/migrations.js";
import { RedisDatabase } from "./redis/client.js";
import type { DatabaseHealth } from "./types.js";
import {
  UserRepository,
  GroupRepository,
  AuditRepository,
} from "./postgresql/repositories/core.js";
import { EconomyRepository } from "./postgresql/repositories/economy.js";
import { LevelingRepository } from "./postgresql/repositories/leveling.js";
import { ModerationRepository } from "./postgresql/repositories/moderation.js";
import { AiRepository } from "./postgresql/repositories/ai.js";
import { MaintenanceRepository } from "./postgresql/repositories/maintenance.js";
import { AnnouncementRepository } from "./postgresql/repositories/announcements.js";
import { AutomationRepository } from "./postgresql/repositories/automation.js";
import { SchedulerRepository } from "./postgresql/repositories/scheduler.js";
import { BankRepository } from "./postgresql/repositories/bank.js";
import { OperationalRepository, CheckpointRepository } from "./turso/repositories.js";
import { ArchiveRepository } from "./mongodb/repositories.js";
import { CooldownStore } from "./redis/cooldowns.js";
import { LockManager } from "./redis/locks.js";
import { RedisCache } from "./redis/cache.js";
import { RateLimiterStore } from "./redis/ratelimit.js";

export interface DatabaseBundle {
  health: () => Promise<DatabaseHealth[]>;
  postgres?: PostgresClient;
  turso?: TursoClient;
  mongodb?: MongoDatabase;
  redis?: RedisDatabase;
  users?: UserRepository;
  groups?: GroupRepository;
  audit?: AuditRepository;
  economy?: EconomyRepository;
  bank?: BankRepository;
  leveling?: LevelingRepository;
  moderation?: ModerationRepository;
  ai?: AiRepository;
  maintenance?: MaintenanceRepository;
  announcements?: AnnouncementRepository;
  automation?: AutomationRepository;
  scheduler?: SchedulerRepository;
  operational?: OperationalRepository;
  checkpoints?: CheckpointRepository;
  archive?: ArchiveRepository;
  cooldowns?: CooldownStore;
  locks?: LockManager;
  cache?: RedisCache;
  rateLimiter?: RateLimiterStore;
}

export class DatabaseManager {
  public readonly bundle: DatabaseBundle;

  public constructor(
    private readonly config: AppConfig,
    private readonly secrets: ResolvedSecrets,
    private readonly logger: AppLogger,
  ) {
    this.bundle = { health: () => this.health() };
  }

  public async initialize(): Promise<void> {
    const { databases } = this.config;
    if (databases.postgresql.enabled) {
      this.bundle.postgres = new PostgresClient(this.secrets.postgresUrl!, this.config);
      await this.bundle.postgres.connect();
      await new PostgresMigrator(this.bundle.postgres, this.logger).migrate();
      this.bundle.users = new UserRepository(this.bundle.postgres);
      this.bundle.groups = new GroupRepository(this.bundle.postgres);
      this.bundle.audit = new AuditRepository(this.bundle.postgres);
      this.bundle.economy = new EconomyRepository(this.bundle.postgres);
      this.bundle.bank = new BankRepository(this.bundle.postgres);
      this.bundle.leveling = new LevelingRepository(this.bundle.postgres);
      this.bundle.moderation = new ModerationRepository(this.bundle.postgres);
      this.bundle.ai = new AiRepository(this.bundle.postgres);
      this.bundle.maintenance = new MaintenanceRepository(this.bundle.postgres);
      this.bundle.announcements = new AnnouncementRepository(this.bundle.postgres);
      this.bundle.automation = new AutomationRepository(this.bundle.postgres);
      this.bundle.scheduler = new SchedulerRepository(this.bundle.postgres);
      this.logger.info("PostgreSQL connected and migrations verified");
    }

    if (databases.turso.enabled) {
      // Failure is intentionally fatal: a missing or inaccessible production
      // database must never be replaced by an empty local database.
      this.bundle.turso = new TursoClient(
        this.secrets.tursoUrl!,
        this.secrets.tursoToken!,
        this.config,
      );
      await this.bundle.turso.connect();
      await new TursoMigrator(this.bundle.turso, this.logger).migrate();
      if (databases.turso.verifyIntegrityOnStartup) {
        const result = await this.bundle.turso.integrityCheck();
        if (result !== "ok") throw new Error(`Turso integrity check failed: ${result}`);
      }
      this.bundle.operational = new OperationalRepository(this.bundle.turso);
      this.bundle.checkpoints = new CheckpointRepository(this.bundle.turso);
      this.logger.info("Turso connected, migrations verified and integrity confirmed");
    }

    if (databases.mongodb.enabled) {
      this.bundle.mongodb = new MongoDatabase(this.secrets.mongodbUrl!, this.config);
      await this.bundle.mongodb.connect();
      await new MongoMigrator(this.bundle.mongodb, this.logger).migrate();
      this.bundle.archive = new ArchiveRepository(this.bundle.mongodb);
      this.logger.info("MongoDB connected and indexes verified");
    }

    if (databases.redis.enabled) {
      this.bundle.redis = new RedisDatabase(this.secrets.redisUrl!, this.config);
      await this.bundle.redis.connect();
      this.bundle.cooldowns = new CooldownStore(this.bundle.redis);
      this.bundle.locks = new LockManager(this.bundle.redis);
      this.bundle.cache = new RedisCache(this.bundle.redis, this.config.cache.maximumEntries);
      this.bundle.rateLimiter = new RateLimiterStore(this.bundle.redis);
      this.logger.info("Redis connected");
    }
  }

  public async health(): Promise<DatabaseHealth[]> {
    const checks = await Promise.all(
      [this.bundle.postgres, this.bundle.turso, this.bundle.mongodb, this.bundle.redis]
        .filter((component) => component !== undefined)
        .map(async (component) => component!.health()),
    );
    return checks;
  }

  public async close(): Promise<void> {
    await this.bundle.redis?.close();
    await this.bundle.mongodb?.close();
    await this.bundle.turso?.close();
    await this.bundle.postgres?.close();
  }
}
