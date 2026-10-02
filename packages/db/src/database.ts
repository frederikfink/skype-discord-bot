import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Period } from "./periods.js";
import { getPeriodStartMs } from "./periods.js";
import { emptyRadioState, type RadioStatePayload } from "./radio.js";
import { emptyVoicePresence, type VoicePresencePayload } from "./voice-presence.js";

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalMs: number;
}

export interface DatabaseDiagnostics {
  userStatsRows: number;
  voiceSessionRows: number;
  usersWithVoiceMs: number;
  totalVoiceMs: number;
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

      CREATE TABLE IF NOT EXISTS radio_state (
        id          INTEGER PRIMARY KEY CHECK (id = 1),
        payload     TEXT NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS voice_presence (
        id          INTEGER PRIMARY KEY CHECK (id = 1),
        payload     TEXT NOT NULL,
        updated_at  INTEGER NOT NULL
      );
    `);
  }

  hasRadioStateRow(): boolean {
    const row = this.db.prepare("SELECT 1 AS ok FROM radio_state WHERE id = 1").get();
    return row !== undefined;
  }

  getRadioState(): RadioStatePayload {
    const row = this.db
      .prepare("SELECT payload FROM radio_state WHERE id = 1")
      .get() as { payload: string } | undefined;
    if (!row) return emptyRadioState();
    try {
      return JSON.parse(row.payload) as RadioStatePayload;
    } catch {
      return emptyRadioState();
    }
  }

  getVoicePresence(): VoicePresencePayload {
    const row = this.db
      .prepare("SELECT payload FROM voice_presence WHERE id = 1")
      .get() as { payload: string } | undefined;
    if (!row) return emptyVoicePresence();
    try {
      return JSON.parse(row.payload) as VoicePresencePayload;
    } catch {
      return emptyVoicePresence();
    }
  }

  setVoicePresence(payload: VoicePresencePayload): void {
    const updatedAt = Date.now();
    const body = JSON.stringify({ ...payload, updatedAt });
    this.db
      .prepare(
        `
        INSERT INTO voice_presence (id, payload, updated_at)
        VALUES (1, @payload, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          payload = @payload,
          updated_at = @updatedAt
      `,
      )
      .run({ payload: body, updatedAt });
  }

  setRadioState(payload: RadioStatePayload): void {
    const updatedAt = Date.now();
    const body = JSON.stringify({ ...payload, updatedAt });
    this.db
      .prepare(
        `
        INSERT INTO radio_state (id, payload, updated_at)
        VALUES (1, @payload, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          payload = @payload,
          updated_at = @updatedAt
      `,
      )
      .run({ payload: body, updatedAt });
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

  getVoiceLeaderboard(period: Period, limit?: number): LeaderboardEntry[] {
    const since = getPeriodStartMs(period);
    if (since === null) {
      const query = `
        SELECT user_id AS userId, username, voice_ms AS totalMs
        FROM user_stats
        WHERE voice_ms > 0
        ORDER BY voice_ms DESC
        ${limit === undefined ? "" : "LIMIT ?"}
      `;
      return (
        limit === undefined
          ? this.db.prepare(query).all()
          : this.db.prepare(query).all(limit)
      ) as LeaderboardEntry[];
    }

    const query = `
      SELECT
        user_id AS userId,
        MAX(username) AS username,
        SUM(duration_ms) AS totalMs
      FROM voice_sessions
      WHERE ended_at >= ?
      GROUP BY user_id
      HAVING totalMs > 0
      ORDER BY totalMs DESC
      ${limit === undefined ? "" : "LIMIT ?"}
    `;
    return (
      limit === undefined
        ? this.db.prepare(query).all(since)
        : this.db.prepare(query).all(since, limit)
    ) as LeaderboardEntry[];
  }

  getDiagnostics(): DatabaseDiagnostics {
    const userStatsRows = (
      this.db.prepare("SELECT COUNT(*) AS count FROM user_stats").get() as { count: number }
    ).count;
    const voiceSessionRows = (
      this.db.prepare("SELECT COUNT(*) AS count FROM voice_sessions").get() as { count: number }
    ).count;
    const voiceAgg = this.db
      .prepare(
        "SELECT COUNT(*) AS usersWithVoiceMs, COALESCE(SUM(voice_ms), 0) AS totalVoiceMs FROM user_stats WHERE voice_ms > 0",
      )
      .get() as { usersWithVoiceMs: number; totalVoiceMs: number };

    return {
      userStatsRows,
      voiceSessionRows,
      usersWithVoiceMs: voiceAgg.usersWithVoiceMs,
      totalVoiceMs: voiceAgg.totalVoiceMs,
    };
  }

  close(): void {
    this.db.close();
  }
}
