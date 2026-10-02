# skype-bot

Discord voice activity tracker with a web dashboard.

## Development

Install dependencies from the repo root:

```bash
pnpm install
```

Copy `.env.example` to `.env` and fill in Discord credentials.

Run the bot and web app together:

```bash
pnpm dev
```

Run individually:

```bash
pnpm dev:bot
pnpm dev:web
```

Register slash commands:

```bash
pnpm deploy-commands
```

## Music bot

The Discord bot can play **YouTube** and **SoundCloud** links (or YouTube search terms) in voice channels. Playback uses `@discordjs/voice`, **FFmpeg** (included in the bot Docker image), and **play-dl**.

| Command | Description |
|---------|-------------|
| `/play query:` | URL or search; joins your voice channel |
| `/skip` | Skip current track |
| `/stop` | Stop and clear queue |
| `/queue` | Show upcoming tracks |
| `/nowplaying` | Current track |

The XP **Winamp** window on the dashboard polls `GET /api/radio`, which reads the same SQLite `radio_state` row the bot updates while playing. Controls on the web UI are display-only — use Discord commands to DJ.

**Local playback:** Install FFmpeg on your PATH (`brew install ffmpeg` on macOS). Join a voice channel, run `pnpm dev:bot`, then `/play` with a URL.

**YouTube on Railway:** Google often blocks datacenter IPs (`Sign in to confirm you're not a bot`). Options:

1. **SoundCloud** — paste a SoundCloud track URL; usually works without extra setup.
2. **YouTube cookies** — use a **throwaway** Google account (not your main):
   - In Chrome, log into YouTube and open DevTools → **Network** → reload `youtube.com` → pick any request → copy the full **`Cookie`** request header value.
   - Railway → bot service → **Variables** → `YOUTUBE_COOKIES` = that string (one line).
   - Redeploy or restart the bot. Cookies expire; refresh them if YouTube fails again.

**If YouTube stops working:** bump `play-dl` in `apps/bot` (`pnpm update play-dl --filter @repo/bot`) and redeploy.

## Database (SQLite)

The bot and web app read the **same SQLite file** via `DATABASE_PATH` (default `./data/bot.db` at the repo root). SQLite is a local file — there is no remote connection string.

| Environment | Where data lives |
|-------------|------------------|
| **Railway (bot)** | Volume `bot-data` → `/app/data/bot.db` |
| **Local dev** | `./data/bot.db` (only has data if the bot ran locally) |

If the dashboard shows **“No data yet”** locally, your local `bot.db` is probably empty while production stats are on Railway.

### Option A — Use production data locally

1. [Install the Railway CLI](https://docs.railway.com/guides/cli) and run `railway link` in this repo.
2. Sync the bot’s database file from the Railway volume ( **`railway volume files download`** — no SSH keys needed):

```bash
pnpm db:sync-prod
```

3. In `.env`, set:

```env
DATABASE_PATH=./data/bot-prod.db
```

4. Restart the web app: `pnpm dev:web`.

If the volume is not named `bot-data`, run: `RAILWAY_VOLUME=<volume-name> pnpm db:sync-prod`.

Optional SSH fallback (requires `ssh-keygen` + `railway ssh keys add`): `SYNC_USE_SSH=1 RAILWAY_SERVICE=skype-discord-bot pnpm db:sync-prod`.

### Option B — Run the dashboard on Railway (recommended for prod)

Add a **second Railway service** for the web app:

1. Same GitHub repo, **root directory** = repo root (not `apps/web`).
2. Config file: `apps/web/railway.toml` (Dockerfile `apps/web/Dockerfile`).
3. Attach the **existing** volume `bot-data` at **`/app/data`** (same as the bot service).
4. No extra env vars required (`DATABASE_PATH` defaults to `/app/data/bot.db` in the image).

The bot and dashboard then share the live database on the volume.

### Live desktop characters (voice rooms)

The XP home screen shows avatars for everyone currently in Discord voice channels. That data is **live**: the bot writes a `voice_presence` row whenever someone joins, leaves, or moves channels.

| Setup | Characters update? |
|-------|-------------------|
| **Railway** bot + web on the same `bot-data` volume | Yes |
| **Local** `pnpm dev:bot` + `pnpm dev:web` with the same `DATABASE_PATH` | Yes |
| **`pnpm db:sync-prod` + web only** | No — sync copies leaderboard/history at one moment; it does not stream voice presence |

Open **Debug Info** on the desktop to see `voicePresence` and `voicePresenceMemberCount` from your current database file.

## Monorepo layout

- `apps/bot` — Discord bot
- `apps/web` — Next.js dashboard (`/` leaderboard, `/api/stats`, `/api/radio` JSON)
- `packages/db` — shared SQLite access layer
