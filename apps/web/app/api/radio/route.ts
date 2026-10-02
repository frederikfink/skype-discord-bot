import { fetchBotRadio } from "@/lib/fetch-bot-radio";
import { getStatsDatabase } from "@/lib/database";
import { emptyRadioState } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readRadioFromSqlite() {
  const db = getStatsDatabase();
  const syncedWithBot = db.hasRadioStateRow();
  const state = db.getRadioState();

  if (!state.current && state.queue.length === 0 && !state.isPlaying && !state.isPaused) {
    return { ...emptyRadioState(), syncedWithBot };
  }

  return { ...state, syncedWithBot };
}

export async function GET() {
  if (process.env.BOT_RADIO_URL?.trim()) {
    try {
      return NextResponse.json(await fetchBotRadio());
    } catch (error) {
      console.error("Failed to fetch bot radio:", error);
      return NextResponse.json(
        {
          ...emptyRadioState(),
          syncedWithBot: false,
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(readRadioFromSqlite());
}
