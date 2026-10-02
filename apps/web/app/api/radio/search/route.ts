import { fetchBotSoundCloudSearch } from "@/lib/fetch-bot-radio";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.BOT_RADIO_URL?.trim()) {
    return NextResponse.json(
      { error: "SoundCloud browse requires BOT_RADIO_URL (search runs on the bot)." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const limitRaw = Number(searchParams.get("limit") ?? "15");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 15;

  try {
    const results = await fetchBotSoundCloudSearch(q, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("SoundCloud search proxy failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 502 },
    );
  }
}
