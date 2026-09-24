import type { ChatInputCommandInteraction } from "discord.js";
import type { StatsDatabase } from "../db/index.js";
import { formatDuration } from "../utils/formatDuration.js";
import { parsePeriod, periodLabels, type Period } from "../utils/periods.js";

function buildVoiceLeaderboardMessage(db: StatsDatabase, period: Period): string {
  const entries = db.getVoiceLeaderboard(period, 10);
  const title = `🎙 Voice Activity Leaderboard — ${periodLabels[period]}`;

  if (entries.length === 0) {
    return `${title}\n\nNo data yet.`;
  }

  const lines = entries.map((entry, index) => {
    const rank = index + 1;
    const time = formatDuration(entry.totalMs);
    return `${rank}. ${entry.username}    ${time}`;
  });

  return `${title}\n\n${lines.join("\n")}`;
}

export async function handleVoiceLeaderboardCommand(
  interaction: ChatInputCommandInteraction,
  db: StatsDatabase,
): Promise<void> {
  const period = parsePeriod(interaction.options.getString("period"));
  await interaction.reply(buildVoiceLeaderboardMessage(db, period));
}
