import type { GuildMember, Presence } from "discord.js";
import type { StatsDatabase } from "../db/index.js";

const ACTIVE_STATUSES = new Set(["online", "idle", "dnd"]);

export class PresenceTracker {
  private sessions = new Map<string, { since: number; username: string }>();

  constructor(private db: StatsDatabase) {}

  isActiveStatus(status: Presence["status"] | undefined): boolean {
    return status !== undefined && ACTIVE_STATUSES.has(status);
  }

  handleUpdate(oldPresence: Presence | null, newPresence: Presence): void {
    const member = newPresence.member;
    if (!member || member.user.bot) return;

    const userId = member.id;
    const username = member.displayName;
    const wasActive = this.isActiveStatus(oldPresence?.status);
    const isActive = this.isActiveStatus(newPresence.status);

    if (!wasActive && isActive) {
      this.startSession(userId, username);
      return;
    }

    if (wasActive && !isActive) {
      this.endSession(userId, username);
    }
  }

  startSession(userId: string, username: string): void {
    this.sessions.set(userId, { since: Date.now(), username });
  }

  endSession(userId: string, username: string): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    const duration = Date.now() - session.since;
    this.db.addTime(userId, username, "presence", duration);
    this.sessions.delete(userId);
  }

  seedActiveMembers(members: Iterable<GuildMember>): void {
    for (const member of members) {
      if (member.user.bot) continue;
      if (!this.isActiveStatus(member.presence?.status)) continue;
      this.startSession(member.id, member.displayName);
    }
  }

  flushAll(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions) {
      this.db.addTime(userId, session.username, "presence", now - session.since);
    }
    this.sessions.clear();
  }
}
