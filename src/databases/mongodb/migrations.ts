import type { AppLogger } from "../../logging/logger.js";
import type { MongoDatabase } from "./client.js";

/** Idempotent index and collection management for the document archive. */
export class MongoMigrator {
  public constructor(
    private readonly database: MongoDatabase,
    private readonly logger: AppLogger,
  ) {}

  public async migrate(): Promise<void> {
    const db = this.database.database();
    await db.createCollection("message_archive").catch(() => undefined);
    await db.createCollection("event_archive").catch(() => undefined);
    await db.createCollection("snapshots").catch(() => undefined);
    await db.createCollection("automation_outputs").catch(() => undefined);

    await db
      .collection("message_archive")
      .createIndex({ threadId: 1, createdAt: -1 }, { name: "thread_created" });
    await db
      .collection("message_archive")
      .createIndex({ senderId: 1, createdAt: -1 }, { name: "sender_created" });
    await db
      .collection("message_archive")
      .createIndex({ expiresAt: 1 }, { name: "retention", expireAfterSeconds: 0 });
    await db
      .collection("event_archive")
      .createIndex({ eventType: 1, createdAt: -1 }, { name: "event_created" });
    await db
      .collection("event_archive")
      .createIndex({ expiresAt: 1 }, { name: "event_retention", expireAfterSeconds: 0 });
    await db
      .collection("snapshots")
      .createIndex({ kind: 1, createdAt: -1 }, { name: "snapshot_kind" });
    await db
      .collection("automation_outputs")
      .createIndex({ threadId: 1, createdAt: -1 }, { name: "automation_thread" });

    this.logger.info("MongoDB indexes verified");
  }
}
