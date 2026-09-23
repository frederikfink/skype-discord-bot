import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type TimeType = "presence" | "voice";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalMs: number;
}

const columnByType: Record<TimeType, "presence_ms" | "voice_ms"> = {
  presence: "presence_ms",
  voice: "voice_ms",
};

export class StatsDatabase {
  private db: Database.Database;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id     TEXT PRIMARY KEY,
        username    TEXT NOT NULL,
        presence_ms INTEGER NOT NULL DEFAULT 0,
        voice_ms    INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  addTime(userId: string, username: string, type: TimeType, ms: number): void {
    if (ms <= 0) return;

    const column = columnByType[type];
    const presenceMs = type === "presence" ? ms : 0;
    const voiceMs = type === "voice" ? ms : 0;

    this.db
      .prepare(
        `
        INSERT INTO user_stats (user_id, username, presence_ms, voice_ms)
        VALUES (@userId, @username, @presenceMs, @voiceMs)
        ON CONFLICT(user_id) DO UPDATE SET
          username = @username,
          ${column} = ${column} + @ms
        `,
      )
      .run({ userId, username, ms, presenceMs, voiceMs });
  }

  getLeaderboard(type: TimeType, limit = 10): LeaderboardEntry[] {
    const column = columnByType[type];
    return this.db
      .prepare(
        `
        SELECT user_id AS userId, username, ${column} AS totalMs
        FROM user_stats
        WHERE ${column} > 0
        ORDER BY ${column} DESC
        LIMIT ?
        `,
      )
      .all(limit) as LeaderboardEntry[];
  }

  close(): void {
    this.db.close();
  }
}
