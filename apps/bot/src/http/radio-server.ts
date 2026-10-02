import type { StatsDatabase } from "@repo/db";
import { emptyRadioState } from "@repo/db";
import type { Client } from "discord.js";
import { createServer, type Server } from "node:http";
import { formatPlayError } from "../music/play-dl-setup.js";
import type { MusicManager } from "../music/player.js";
import { searchSoundCloudTracks } from "../music/search-soundcloud.js";
import { readJsonBody } from "./read-json-body.js";

type RadioServerOptions = {
  db: StatsDatabase;
  music: MusicManager;
  guildId: string;
  getClient: () => Client | null;
};

function readRadioJson(db: StatsDatabase) {
  const syncedWithBot = db.hasRadioStateRow();
  const state = db.getRadioState();

  if (!state.current && state.queue.length === 0 && !state.isPlaying && !state.isPaused) {
    return { ...emptyRadioState(), syncedWithBot };
  }

  return { ...state, syncedWithBot };
}

function isAuthorized(requestSecret: string | undefined): boolean {
  const expected = process.env.BOT_RADIO_SECRET?.trim();
  if (!expected) {
    return true;
  }
  return requestSecret === expected;
}

function readAuth(req: import("node:http").IncomingMessage): string | undefined {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
}

function json(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
  cacheControl?: string,
): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
  });
  res.end(JSON.stringify(body));
}

export function startRadioServer({ db, music, guildId, getClient }: RadioServerOptions): Server {
  const port = Number(process.env.PORT) || 8080;

  const server = createServer(async (req, res) => {
    const requestUrl = req.url ?? "/";
    const parsed = new URL(requestUrl, "http://localhost");
    const pathname = parsed.pathname;
    const auth = readAuth(req);

    if (req.method === "GET" && pathname === "/health") {
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/radio") {
      if (!isAuthorized(auth)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      json(res, 200, readRadioJson(db), "no-store");
      return;
    }

    if (req.method === "GET" && pathname === "/radio/search") {
      if (!isAuthorized(auth)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      const q = parsed.searchParams.get("q")?.trim() ?? "";
      if (!q) {
        json(res, 400, { error: "Missing q query parameter" });
        return;
      }

      const limitRaw = Number(parsed.searchParams.get("limit") ?? "15");
      const limit = Number.isFinite(limitRaw) ? limitRaw : 15;

      try {
        const results = await searchSoundCloudTracks(q, limit);
        json(res, 200, { results }, "no-store");
      } catch (error) {
        console.error("SoundCloud search failed:", error);
        json(res, 502, { error: formatPlayError(error) });
      }
      return;
    }

    if (req.method === "POST" && (pathname === "/radio/pause" || pathname === "/radio/resume")) {
      if (!isAuthorized(auth)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      const player = music.get(guildId);
      const ok = pathname === "/radio/pause" ? player.pause() : player.resume();
      json(res, ok ? 200 : 409, { ok, state: readRadioJson(db) });
      return;
    }

    if (req.method === "POST" && pathname === "/radio/play") {
      if (!isAuthorized(auth)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }

      const client = getClient();
      if (!client) {
        json(res, 503, { error: "Bot is still starting — try again in a moment." });
        return;
      }

      let url: string | undefined;
      try {
        const body = (await readJsonBody(req)) as { url?: string } | null;
        url = body?.url?.trim();
      } catch {
        json(res, 400, { error: "Invalid JSON body" });
        return;
      }

      if (!url) {
        json(res, 400, { error: "Missing url in body" });
        return;
      }

      try {
        const tracks = await music.enqueueUrl(guildId, client, url);
        json(res, 200, {
          ok: true,
          enqueued: tracks.length,
          tracks: tracks.map((t) => ({ id: t.id, title: t.title, url: t.url })),
          state: readRadioJson(db),
        });
      } catch (error) {
        console.error("Remote play failed:", error);
        const message = error instanceof Error ? error.message : "Play failed";
        const status = message.includes("voice channel") ? 503 : 502;
        json(res, status, { error: formatPlayError(error) });
      }
      return;
    }

    json(res, 404, { error: "Not found" });
  });

  const host = "0.0.0.0";
  server.listen(port, host, () => {
    console.log(
      `Radio HTTP server listening on http://${host}:${port} (/radio, /radio/search, /radio/play, /radio/pause, /radio/resume, /health)`,
    );
  });

  return server;
}
