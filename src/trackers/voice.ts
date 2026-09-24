import type { GuildMember, VoiceState } from "discord.js";
import type { StatsDatabase } from "../db/index.js";

export class VoiceTracker {
  private sessions = new Map<string, { since: number; username: string }>();

  constructor(private db: StatsDatabase) {}

  handleUpdate(oldState: VoiceState, newState: VoiceState): void {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const userId = member.id;
    const username = member.displayName;
    const wasInVoice = oldState.channelId !== null;
    const isInVoice = newState.channelId !== null;

    if (!wasInVoice && isInVoice) {
      this.startSession(userId, username);
      return;
    }

    if (wasInVoice && !isInVoice) {
      this.endSession(userId, username);
      return;
    }

    if (wasInVoice && isInVoice && oldState.channelId !== newState.channelId) {
      this.endSession(userId, username);
      this.startSession(userId, username);
    }
  }

  startSession(userId: string, username: string): void {
    this.sessions.set(userId, { since: Date.now(), username });
  }

  endSession(userId: string, username: string): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    const duration = Date.now() - session.since;
    this.db.addVoiceTime(userId, username, duration);
    this.sessions.delete(userId);
  }

  seedActiveMembers(members: Iterable<GuildMember>): void {
    for (const member of members) {
      if (member.user.bot) continue;
      if (!member.voice.channelId) continue;
      this.startSession(member.id, member.displayName);
    }
  }

  flushAll(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions) {
      this.db.addVoiceTime(userId, session.username, now - session.since);
    }
    this.sessions.clear();
  }
}
