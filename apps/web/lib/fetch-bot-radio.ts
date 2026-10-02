import type { RadioStatePayload } from "@/lib/radio-types";
import type { SoundCloudSearchHit } from "@/lib/soundcloud-browse-types";

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

export type RadioControlAction = "pause" | "resume";

export async function postBotRadioControl(
  action: RadioControlAction,
): Promise<{ ok: boolean; state: RadioStatePayload }> {
  const base = process.env.BOT_RADIO_URL?.trim();
  if (!base) {
    throw new Error("BOT_RADIO_URL is not configured");
  }

  const url = `${base.replace(/\/$/, "")}/radio/${action}`;
  const secret = process.env.BOT_RADIO_SECRET?.trim();

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
  });

  const body = (await res.json()) as { ok: boolean; state: RadioStatePayload; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Bot radio control HTTP ${res.status}`);
  }

  return body;
}

function botBaseUrl(): string {
  const base = process.env.BOT_RADIO_URL?.trim();
  if (!base) {
    throw new Error("BOT_RADIO_URL is not configured");
  }
  return base.replace(/\/$/, "");
}

function botAuthHeaders(): HeadersInit | undefined {
  const secret = process.env.BOT_RADIO_SECRET?.trim();
  return secret ? { Authorization: `Bearer ${secret}` } : undefined;
}

export async function fetchBotSoundCloudSearch(
  query: string,
  limit = 15,
): Promise<SoundCloudSearchHit[]> {
  const url = new URL(`${botBaseUrl()}/radio/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    cache: "no-store",
    headers: botAuthHeaders(),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Bot search HTTP ${res.status}`);
  }

  const body = (await res.json()) as { results: SoundCloudSearchHit[] };
  return body.results ?? [];
}

export async function postBotRadioPlay(
  trackUrl: string,
): Promise<{ ok: boolean; state: RadioStatePayload; enqueued?: number }> {
  const res = await fetch(`${botBaseUrl()}/radio/play`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...botAuthHeaders(),
    },
    body: JSON.stringify({ url: trackUrl }),
  });

  const body = (await res.json()) as {
    ok: boolean;
    state: RadioStatePayload;
    enqueued?: number;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error ?? `Bot play HTTP ${res.status}`);
  }

  return body;
}
