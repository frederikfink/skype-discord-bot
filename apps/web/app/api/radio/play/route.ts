import { postBotRadioPlay } from "@/lib/fetch-bot-radio";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.BOT_RADIO_URL?.trim()) {
    return NextResponse.json(
      { error: "Queueing tracks from Winamp requires BOT_RADIO_URL." },
      { status: 503 },
    );
  }

  let url: string | undefined;
  try {
    const body = (await request.json()) as { url?: string };
    url = body.url?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const result = await postBotRadioPlay(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bot play proxy failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Play failed" },
      { status: 502 },
    );
  }
}
