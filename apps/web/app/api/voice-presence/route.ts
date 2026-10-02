import { getStatsDatabase } from "@/lib/database";
import { emptyVoicePresence } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const db = getStatsDatabase();
  const presence = db.getVoicePresence();

  if (presence.rooms.length === 0) {
    return NextResponse.json(emptyVoicePresence());
  }

  return NextResponse.json(presence);
}
