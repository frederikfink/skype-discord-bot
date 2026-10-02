import type { StatsDatabase } from "@repo/db";
import { emptyRadioState } from "@repo/db";
import { createServer, type Server } from "node:http";

function readRadioJson(db: StatsDatabase) {
  const syncedWithBot = db.hasRadioStateRow();
  const state = db.getRadioState();

  if (!state.current && state.queue.length === 0 && !state.isPlaying) {
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

export function startRadioServer(db: StatsDatabase): Server {
  const port = Number(process.env.PORT) || 8080;

  const server = createServer((req, res) => {
    const url = req.url?.split("?")[0];

    if (req.method === "GET" && url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "GET" && url === "/radio") {
      const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
      if (!isAuthorized(auth)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(readRadioJson(db)));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const host = "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`Radio HTTP server listening on http://${host}:${port} (/radio, /health)`);
  });

  return server;
}
