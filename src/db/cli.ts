import fs from "node:fs";
import { createDatabase, migrate, resolveDatabaseUrl } from "@/db";

function loadEnvFile(file: string, override: boolean) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] == null) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(".env", false);
  loadEnvFile(".env.local", true);
  const url = resolveDatabaseUrl();
  const opened = createDatabase(url);
  try {
    const applied = await migrate(opened.client);
    const host = url.startsWith("libsql:") ? "hosted libSQL" : url.startsWith("file:") ? "local file" : "database";
    console.log(applied.length ? `Applied ${applied.join(", ")} on ${host}.` : `No pending migrations on ${host}.`);
  } catch {
    console.error("Migration failed. The database URL and token were not printed.");
    process.exitCode = 1;
  } finally {
    opened.client.close();
  }
}

void main();
