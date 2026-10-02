import type { Client, VoiceBasedChannel } from "discord.js";
import type { GuildMusicPlayer } from "./player.js";

export async function resolveMusicVoiceChannel(
  client: Client,
  player: GuildMusicPlayer,
): Promise<VoiceBasedChannel> {
  const existingId = player.getVoiceChannelId();
  if (existingId) {
    const channel = await client.channels.fetch(existingId);
    if (channel?.isVoiceBased()) {
      return channel;
    }
  }

  const configured = process.env.MUSIC_VOICE_CHANNEL_ID?.trim();
  if (configured) {
    const channel = await client.channels.fetch(configured);
    if (!channel?.isVoiceBased()) {
      throw new Error("MUSIC_VOICE_CHANNEL_ID is not a voice channel.");
    }
    if (!channel.joinable) {
      throw new Error("I can't join MUSIC_VOICE_CHANNEL_ID (missing permissions?).");
    }
    return channel;
  }

  throw new Error(
    "No voice channel. Join a channel and use /play once, or set MUSIC_VOICE_CHANNEL_ID on the bot.",
  );
}
