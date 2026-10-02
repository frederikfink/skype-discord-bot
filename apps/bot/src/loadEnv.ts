import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

config({ path: resolve(repoRoot, ".env") });

export function getRepoRoot(): string {
  return repoRoot;
}

export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH ?? "data/bot.db";
  if (configured.startsWith("/") || /^[A-Za-z]:\\/.test(configured)) {
    return configured;
  }
  return resolve(repoRoot, configured);
}
