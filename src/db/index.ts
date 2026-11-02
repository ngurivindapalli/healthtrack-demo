import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { authSchema } from "@/db/schema";
import { MIGRATIONS } from "@/db/migrations";
import { assertProductionAuth, assertProductionDatabase } from "@/lib/production-env";

export type AppDatabase = LibSQLDatabase<typeof authSchema>;

let singleton: { client: Client; db: AppDatabase } | null = null;

export function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "file:data/healthtrack.db";
}

export function createDatabase(url = resolveDatabaseUrl()): { client: Client; db: AppDatabase } {
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
  }
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  const db = drizzle(client, { schema: authSchema });
  return { client, db };
}

async function executeMigration(client: Client, statement: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await client.execute(statement);
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "SQLITE_BUSY" || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
}

function duplicateColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate column/i.test(message);
}

/**
 * Applies pending versions once. A write transaction keeps concurrent callers
 * from applying the same version together. Call this from `npm run db:migrate`
 * before a production deploy. Development still calls it when the database opens.
 */
export async function migrate(client: Client): Promise<string[]> {
  await executeMigration(client, "PRAGMA busy_timeout = 8000");
  await executeMigration(
    client,
    `CREATE TABLE IF NOT EXISTS schema_migration (
      version text PRIMARY KEY,
      applied_at text NOT NULL
    )`,
  );
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const tx = await client.transaction("write");
    const applied: string[] = [];
    try {
      await tx.execute("PRAGMA busy_timeout = 8000");
      const existing = await tx.execute("SELECT version FROM schema_migration");
      const seen = new Set(existing.rows.map((row) => String(row.version)));
      for (const migration of MIGRATIONS) {
        if (seen.has(migration.version)) continue;
        for (const statement of migration.statements) {
          const alter = /^ALTER TABLE (\w+) ADD COLUMN (\w+)/i.exec(statement);
          if (alter) {
            const info = await tx.execute(`PRAGMA table_info(${alter[1]})`);
            if (info.rows.some((row) => String(row.name) === alter[2])) continue;
          }
          try {
            await tx.execute(statement);
          } catch (error) {
            if (!(migration.ignoreDuplicateColumn && duplicateColumn(error))) throw error;
            await tx.rollback();
            throw new Error(`Migration ${migration.version} could not add a column that already exists in a way SQLite can continue.`);
          }
        }
        await tx.execute({
          sql: "INSERT INTO schema_migration (version, applied_at) VALUES (?, ?)",
          args: [migration.version, new Date().toISOString()],
        });
        applied.push(migration.version);
      }
      await tx.commit();
      return applied;
    } catch (error) {
      try {
        await tx.rollback();
      } catch {
        // The original error is the one the caller needs.
      }
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code === "SQLITE_BUSY" && attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Database migration stayed busy.");
}

export function shouldAutoMigrate(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production";
}

export async function getDatabase(): Promise<{ client: Client; db: AppDatabase }> {
  if (!singleton) {
    const url = resolveDatabaseUrl();
    assertProductionAuth();
    assertProductionDatabase(url);
    singleton = createDatabase(url);
    if (shouldAutoMigrate()) await migrate(singleton.client);
  }
  return singleton;
}
