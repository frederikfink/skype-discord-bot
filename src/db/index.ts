import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Period } from "../utils/periods.js";
import { getPeriodStartMs } from "../utils/periods.js";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalMs: number;
}

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

      CREATE TABLE IF NOT EXISTS voice_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     TEXT NOT NULL,
        username    TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        ended_at    INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_voice_sessions_ended_at ON voice_sessions(ended_at);
      CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
    `);
  }

  addVoiceTime(userId: string, username: string, ms: number, endedAt = Date.now()): void {
    if (ms <= 0) return;

    const insertSession = this.db.prepare(`
      INSERT INTO voice_sessions (user_id, username, duration_ms, ended_at)
      VALUES (@userId, @username, @ms, @endedAt)
    `);

    const upsertStats = this.db.prepare(`
      INSERT INTO user_stats (user_id, username, presence_ms, voice_ms)
      VALUES (@userId, @username, 0, @ms)
      ON CONFLICT(user_id) DO UPDATE SET
        username = @username,
        voice_ms = voice_ms + @ms
    `);

    const save = this.db.transaction(() => {
      insertSession.run({ userId, username, ms, endedAt });
      upsertStats.run({ userId, username, ms });
    });

    save();
  }

  getVoiceLeaderboard(period: Period, limit = 10): LeaderboardEntry[] {
    const since = getPeriodStartMs(period);
    if (since === null) {
      return this.db
        .prepare(
          `
          SELECT user_id AS userId, username, voice_ms AS totalMs
          FROM user_stats
          WHERE voice_ms > 0
          ORDER BY voice_ms DESC
          LIMIT ?
          `,
        )
        .all(limit) as LeaderboardEntry[];
    }

    return this.db
      .prepare(
        `
        SELECT
          user_id AS userId,
          MAX(username) AS username,
          SUM(duration_ms) AS totalMs
        FROM voice_sessions
        WHERE ended_at >= ?
        GROUP BY user_id
        HAVING totalMs > 0
        ORDER BY totalMs DESC
        LIMIT ?
        `,
      )
      .all(since, limit) as LeaderboardEntry[];
  }

  close(): void {
    this.db.close();
  }
}
