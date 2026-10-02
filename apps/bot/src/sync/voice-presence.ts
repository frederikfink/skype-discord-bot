import type { StatsDatabase, VoicePresencePayload, VoicePresenceRoom } from "@repo/db";
import { ChannelType, type Guild } from "discord.js";

export function syncVoicePresence(db: StatsDatabase, guild: Guild): void {
  const rooms: VoicePresenceRoom[] = [];

  for (const channel of guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildVoice) continue;

    const members = [...channel.members.values()].filter((member) => !member.user.bot);
    if (members.length === 0) continue;

    members.sort((a, b) => a.displayName.localeCompare(b.displayName));

    rooms.push({
      channelId: channel.id,
      channelName: channel.name,
      members: members.map((member) => ({
        userId: member.id,
        username: member.displayName,
        avatarUrl: member.displayAvatarURL({ extension: "png", size: 128 }),
      })),
    });
  }

  rooms.sort((a, b) => a.channelName.localeCompare(b.channelName));

  const payload: VoicePresencePayload = {
    rooms,
    updatedAt: Date.now(),
  };

  db.setVoicePresence(payload);
}
