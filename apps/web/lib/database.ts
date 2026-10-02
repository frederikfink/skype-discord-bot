import { StatsDatabase } from "@repo/db";
import { config } from "dotenv";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "../..");

config({ path: resolve(repoRoot, ".env") });

export function getResolvedDatabasePath(): string {
  const configured = process.env.DATABASE_PATH ?? "data/bot.db";
  if (configured.startsWith("/") || /^[A-Za-z]:\\/.test(configured)) {
    return configured;
  }
  return resolve(/* turbopackIgnore: true */ repoRoot, configured);
}

let db: StatsDatabase | null = null;

export function getStatsDatabase(): StatsDatabase {
  if (!db) {
    db = new StatsDatabase(getResolvedDatabasePath());
  }
  return db;
}

export function getDatabaseFileDebug() {
  const databasePath = getResolvedDatabasePath();
  const exists = existsSync(databasePath);

  return {
    databasePath,
    envDatabasePath: process.env.DATABASE_PATH ?? null,
    repoRoot,
    cwd: process.cwd(),
    exists,
    sizeBytes: exists ? statSync(databasePath).size : null,
    walExists: existsSync(`${databasePath}-wal`),
    shmExists: existsSync(`${databasePath}-shm`),
  };
}
