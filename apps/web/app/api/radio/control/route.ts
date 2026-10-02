import { postBotRadioControl, type RadioControlAction } from "@/lib/fetch-bot-radio";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set<RadioControlAction>(["pause", "resume"]);

export async function POST(request: Request) {
  if (!process.env.BOT_RADIO_URL?.trim()) {
    return NextResponse.json(
      { error: "Playback control requires BOT_RADIO_URL (Winamp controls the live bot)." },
      { status: 503 },
    );
  }

  let action: RadioControlAction;
  try {
    const body = (await request.json()) as { action?: string };
    if (!body.action || !ACTIONS.has(body.action as RadioControlAction)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    action = body.action as RadioControlAction;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await postBotRadioControl(action);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bot radio control failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Control failed" },
      { status: 502 },
    );
  }
}
