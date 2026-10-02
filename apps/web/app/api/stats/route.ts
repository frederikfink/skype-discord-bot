import { getStatsDatabase } from "@/lib/database";
import { parsePeriod, periodLabels } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const period = parsePeriod(new URL(request.url).searchParams.get("period"));
  const db = getStatsDatabase();
  const entries = db.getVoiceLeaderboard(period);

  return NextResponse.json({
    period,
    label: periodLabels[period],
    count: entries.length,
    entries,
  });
}
