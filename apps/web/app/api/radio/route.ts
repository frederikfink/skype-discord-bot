import { getStatsDatabase } from "@/lib/database";
import { emptyRadioState } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const db = getStatsDatabase();
  const state = db.getRadioState();

  if (!state.current && state.queue.length === 0 && !state.isPlaying) {
    return NextResponse.json(emptyRadioState());
  }

  return NextResponse.json(state);
}
