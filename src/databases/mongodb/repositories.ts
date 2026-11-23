import { z } from "zod";
import type { Filter, Document } from "mongodb";
import type { MongoDatabase } from "./client.js";

const messageDocumentSchema = z.object({
  messageId: z.string().min(1),
  threadId: z.string().min(1),
  senderId: z.string().min(1),
  body: z.string().nullable(),
  createdAt: z.date(),
  expiresAt: z.date(),
});

const eventDocumentSchema = z.object({
  eventType: z.string().min(1),
  threadId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  expiresAt: z.date(),
});

export interface Pagination {
  page: number;
  pageSize: number;
}

export class ArchiveRepository {
  public constructor(
    private readonly database: MongoDatabase,
    private readonly retentionDays: number = 90,
  ) {}

  private expiry(): Date {
    return new Date(Date.now() + this.retentionDays * 24 * 60 * 60 * 1000);
  }

  public async archiveMessage(entry: {
    messageId: string;
    threadId: string;
    senderId: string;
    body: string | null;
    attachments?: unknown[];
  }): Promise<void> {
    const document = messageDocumentSchema.parse({
      messageId: entry.messageId,
      threadId: entry.threadId,
      senderId: entry.senderId,
      body: entry.body,
      createdAt: new Date(),
      expiresAt: this.expiry(),
    });
    await this.database
      .database()
      .collection("message_archive")
      .updateOne(
        { messageId: document.messageId },
        { $set: { ...document, attachments: entry.attachments ?? [] } },
        { upsert: true },
      );
  }

  public async archiveEvent(
    eventType: string,
    threadId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const document = eventDocumentSchema.parse({
      eventType,
      threadId,
      payload,
      createdAt: new Date(),
      expiresAt: this.expiry(),
    });
    await this.database.database().collection("event_archive").insertOne(document);
  }

  public async archiveSnapshot(kind: string, data: Record<string, unknown>): Promise<void> {
    await this.database
      .database()
      .collection("snapshots")
      .insertOne({ kind, data, createdAt: new Date() });
  }

  public async archiveAutomationOutput(
    threadId: string,
    kind: string,
    output: unknown,
  ): Promise<void> {
    await this.database.database().collection("automation_outputs").insertOne({
      threadId,
      kind,
      output,
      createdAt: new Date(),
    });
  }

  public async messages(threadId: string, pagination: Pagination): Promise<Document[]> {
    const filter: Filter<Document> = { threadId };
    return this.database
      .database()
      .collection("message_archive")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * pagination.pageSize)
      .limit(pagination.pageSize)
      .toArray();
  }

  public async events(eventType: string, pagination: Pagination): Promise<Document[]> {
    return this.database
      .database()
      .collection("event_archive")
      .find({ eventType })
      .sort({ createdAt: -1 })
      .skip((pagination.page - 1) * pagination.pageSize)
      .limit(pagination.pageSize)
      .toArray();
  }

  public async purgeExpired(): Promise<number> {
    const now = new Date();
    const messages = await this.database
      .database()
      .collection("message_archive")
      .deleteMany({ expiresAt: { $lte: now } });
    const events = await this.database
      .database()
      .collection("event_archive")
      .deleteMany({ expiresAt: { $lte: now } });
    return messages.deletedCount + events.deletedCount;
  }
}
