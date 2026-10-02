import { formatTrackDuration } from "@repo/db";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { MusicManager } from "../music/player.js";
import { formatPlayError } from "../music/play-dl-setup.js";
import { resolveQuery } from "../music/resolve.js";

function requireVoiceChannel(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember | null;
  const channel = member?.voice.channel;
  if (!channel) {
    throw new Error("Join a voice channel first.");
  }
  if (!channel.joinable) {
    throw new Error("I can't join that voice channel.");
  }
  return channel;
}

export async function handlePlayCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  await interaction.deferReply();
  try {
    const query = interaction.options.getString("query", true);
    const channel = requireVoiceChannel(interaction);
    const tracks = await resolveQuery(query);
    const player = music.get(interaction.guildId!);
    await player.enqueue(tracks, channel);

    const label =
      tracks.length === 1
        ? `Added **${tracks[0]!.title}**`
        : `Added **${tracks.length}** tracks to the queue`;

    await interaction.editReply(label);
  } catch (error) {
    await interaction.editReply(formatPlayError(error));
  }
}

export async function handlePauseCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  const player = music.get(interaction.guildId!);
  if (!player.pause()) {
    await interaction.reply({
      content: "Nothing to pause (not playing or already paused).",
      ephemeral: true,
    });
    return;
  }
  await interaction.reply({ content: "Paused.", ephemeral: true });
}

export async function handleResumeCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  const player = music.get(interaction.guildId!);
  if (!player.resume()) {
    await interaction.reply({
      content: "Nothing to resume.",
      ephemeral: true,
    });
    return;
  }
  await interaction.reply({ content: "Resumed.", ephemeral: true });
}

export async function handleSkipCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  const player = music.get(interaction.guildId!);
  if (!player.skip()) {
    await interaction.reply({ content: "Nothing is playing.", ephemeral: true });
    return;
  }
  await interaction.reply({ content: "Skipped.", ephemeral: true });
}

export async function handleStopCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  music.get(interaction.guildId!).stop();
  await interaction.reply({ content: "Stopped and cleared the queue.", ephemeral: true });
}

export async function handleQueueCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  const player = music.get(interaction.guildId!);
  const current = player.getCurrent();
  const queue = player.getQueue();

  if (!current && queue.length === 0) {
    await interaction.reply({ content: "The queue is empty.", ephemeral: true });
    return;
  }

  const lines: string[] = [];
  if (current) {
    lines.push(`**Now:** ${current.title} (${formatTrackDuration(current.durationSeconds)})`);
  }
  const preview = queue.slice(0, 10);
  preview.forEach((track, index) => {
    lines.push(`${index + 1}. ${track.title} (${formatTrackDuration(track.durationSeconds)})`);
  });
  if (queue.length > 10) {
    lines.push(`… and ${queue.length - 10} more`);
  }

  await interaction.reply({ content: lines.join("\n"), ephemeral: true });
}

export async function handleNowPlayingCommand(
  interaction: ChatInputCommandInteraction,
  music: MusicManager,
): Promise<void> {
  const current = music.get(interaction.guildId!).getCurrent();
  if (!current) {
    await interaction.reply({ content: "Nothing is playing.", ephemeral: true });
    return;
  }
  await interaction.reply({
    content: `**${current.title}** (${formatTrackDuration(current.durationSeconds)})\n${current.url}`,
    ephemeral: true,
  });
}
