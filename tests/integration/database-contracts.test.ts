import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AppConfig } from "../../src/config/index.js";
import { TursoClient } from "../../src/databases/turso/client.js";

const config = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "config.json"), "utf8"),
) as AppConfig;

describe("database ownership contracts", () => {
  it("refuses to substitute a local SQLite file for the production Turso database", () => {
    expect(() => new TursoClient("file:./data/local.db", "token", config)).toThrow(/remote libsql/);
  });

  it("refuses in-memory SQLite for the production operational database", () => {
    expect(() => new TursoClient(":memory:", "token", config)).toThrow(/remote libsql/);
  });

  it("ships separate dialect migrations for PostgreSQL and Turso", () => {
    const pg = readFileSync(
      path.resolve(process.cwd(), "database/postgresql/migrations/001_core.sql"),
      "utf8",
    );
    const turso = readFileSync(
      path.resolve(process.cwd(), "database/turso/migrations/001_operational_history.sql"),
      "utf8",
    );
    expect(pg).toContain("TIMESTAMPTZ");
    expect(turso).toContain("AUTOINCREMENT");
    expect(turso).not.toContain("TIMESTAMPTZ");
  });

  it("provides the consolidated panindigan.sql schema entry point", () => {
    const schema = readFileSync(
      path.resolve(process.cwd(), "database/postgresql/schema/panindigan.sql"),
      "utf8",
    );
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS bot_users");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS maintenances");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS announcements");
  });
});
