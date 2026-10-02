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

  const debugPayload = {
    file: getDatabaseFileDebug(),
    period,
    periodLabel: periodLabels[period],
    leaderboard: entries,
    diagnostics: db.getDiagnostics(),
  };

  return <XpDesktop period={period} entries={entries} debugPayload={debugPayload} />;
}
