import play from "play-dl";

let soundCloudClientId: string | null = null;

async function fetchSoundCloudClientId(): Promise<string | null> {
  const fromEnv = process.env.SOUNDCLOUD_CLIENT_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const id = await play.getFreeClientID();
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch (error) {
    console.warn("play.getFreeClientID() failed:", error);
    return null;
  }
}

export async function setupPlayDl(): Promise<void> {
  const youtubeCookie = process.env.YOUTUBE_COOKIES?.trim();
  soundCloudClientId = await fetchSoundCloudClientId();

  const token: {
    youtube?: { cookie: string };
    soundcloud?: { client_id: string };
  } = {};

  if (youtubeCookie) {
    token.youtube = { cookie: youtubeCookie };
    console.log("YouTube cookies loaded for play-dl.");
  } else {
    console.warn(
      "YOUTUBE_COOKIES is not set. YouTube often blocks cloud hosts (e.g. Railway); SoundCloud may still work.",
    );
  }

  if (soundCloudClientId) {
    token.soundcloud = { client_id: soundCloudClientId };
    console.log("SoundCloud client ID configured for play-dl.");
  } else {
    console.warn(
      "SoundCloud client ID unavailable. Set SOUNDCLOUD_CLIENT_ID on Railway or SoundCloud URLs will fail.",
    );
  }

  if (token.youtube || token.soundcloud) {
    await play.setToken(token);
  }
}

/** Call before SoundCloud validate/stream (play-dl uses a module-global client id). */
export async function ensureSoundCloudReady(): Promise<void> {
  if (soundCloudClientId) {
    return;
  }

  soundCloudClientId = await fetchSoundCloudClientId();
  if (!soundCloudClientId) {
    throw new Error(
      "SoundCloud is not configured. Set SOUNDCLOUD_CLIENT_ID in Railway (see README) and redeploy.",
    );
  }

  await play.setToken({
    soundcloud: { client_id: soundCloudClientId },
  });
}

export function formatPlayError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Could not play that track.";
  if (/client_id/i.test(message)) {
    return "SoundCloud is not configured on the server. Set **SOUNDCLOUD_CLIENT_ID** in Railway (see README).";
  }
  if (/confirm you're not a bot|not a bot|Captcha page|unusual traffic/i.test(message)) {
    return [
      "YouTube blocked requests from this server (bot check).",
      "Fix: set **YOUTUBE_COOKIES** on Railway (see README), or use a **SoundCloud** URL.",
    ].join(" ");
  }
  if (message.length > 400) {
    return `${message.slice(0, 397)}...`;
  }
  return message;
}
