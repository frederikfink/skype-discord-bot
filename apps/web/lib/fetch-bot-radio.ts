import type { RadioStatePayload } from "@/lib/radio-types";

export async function fetchBotRadio(): Promise<RadioStatePayload> {
  const base = process.env.BOT_RADIO_URL?.trim();
  if (!base) {
    throw new Error("BOT_RADIO_URL is not configured");
  }

  const url = base.endsWith("/radio") ? base : `${base.replace(/\/$/, "")}/radio`;
  const secret = process.env.BOT_RADIO_SECRET?.trim();

  const res = await fetch(url, {
    cache: "no-store",
    headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Bot radio HTTP ${res.status}`);
  }

  return (await res.json()) as RadioStatePayload;
}
