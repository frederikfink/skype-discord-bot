import type { ChatInputCommandInteraction } from "discord.js";
import type { StatsDatabase, TimeType } from "../db/index.js";
import { formatDuration } from "../utils/formatDuration.js";

const titles: Record<TimeType, string> = {
  presence: "🏆 Online Time Leaderboard",
  voice: "🎙 Voice Activity Leaderboard",
};

function buildLeaderboardMessage(db: StatsDatabase, type: TimeType): string {
  const entries = db.getLeaderboard(type, 10);
  if (entries.length === 0) {
    return `${titles[type]}\n\nNo data yet.`;
  }

  const lines = entries.map((entry, index) => {
    const rank = index + 1;
    const time = formatDuration(entry.totalMs);
    return `${rank}. ${entry.username}    ${time}`;
  });

  return `${titles[type]}\n\n${lines.join("\n")}`;
}

export async function handleLeaderboardCommand(
  interaction: ChatInputCommandInteraction,
  db: StatsDatabase,
  type: TimeType,
): Promise<void> {
  await interaction.reply(buildLeaderboardMessage(db, type));
}
