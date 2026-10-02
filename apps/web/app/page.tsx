import { XpDesktop } from "@/components/xp/xp-desktop";
import { getDatabaseFileDebug, getStatsDatabase } from "@/lib/database";
import { parsePeriod, periodLabels } from "@repo/db";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam ?? null);
  const db = getStatsDatabase();
  const entries = db.getVoiceLeaderboard(period);

  const voicePresence = db.getVoicePresence();
  const voicePresenceMemberCount = voicePresence.rooms.reduce(
    (total, room) => total + room.members.length,
    0,
  );

  const debugPayload = {
    file: getDatabaseFileDebug(),
    period,
    periodLabel: periodLabels[period],
    leaderboard: entries,
    diagnostics: db.getDiagnostics(),
    voicePresence,
    voicePresenceMemberCount,
    voicePresenceNote:
      voicePresenceMemberCount === 0
        ? "Empty — the Discord bot must run against this same DATABASE_PATH and write voice_presence (db:sync only copies a snapshot; it does not stream live voice)."
        : null,
  };

  return <XpDesktop period={period} entries={entries} debugPayload={debugPayload} />;
}
