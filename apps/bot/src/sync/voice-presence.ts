import type { StatsDatabase, VoicePresencePayload, VoicePresenceRoom } from "@repo/db";
import type { Guild } from "discord.js";

export function syncVoicePresence(db: StatsDatabase, guild: Guild): void {
  const roomMap = new Map<string, VoicePresenceRoom>();

  for (const voiceState of guild.voiceStates.cache.values()) {
    const channelId = voiceState.channelId;
    if (!channelId) continue;

    const member = voiceState.member;
    if (!member || member.user.bot) continue;

    let room = roomMap.get(channelId);
    if (!room) {
      const channel = voiceState.channel ?? guild.channels.cache.get(channelId);
      room = {
        channelId,
        channelName: channel?.name ?? "Voice",
        members: [],
      };
      roomMap.set(channelId, room);
    }

    room.members.push({
      userId: member.id,
      username: member.displayName,
      avatarUrl: member.displayAvatarURL({ extension: "png", size: 128 }),
    });
  }

  const rooms = [...roomMap.values()];
  for (const room of rooms) {
    room.members.sort((a, b) => a.username.localeCompare(b.username));
  }
  rooms.sort((a, b) => a.channelName.localeCompare(b.channelName));

  const payload: VoicePresencePayload = {
    rooms,
    updatedAt: Date.now(),
  };

  db.setVoicePresence(payload);
}
