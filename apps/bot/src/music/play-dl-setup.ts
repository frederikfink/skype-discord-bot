import play from "play-dl";

export async function setupPlayDl(): Promise<void> {
  const cookies = process.env.YOUTUBE_COOKIES?.trim();
  if (cookies) {
    play.setToken({ youtube: { cookie: cookies } });
    console.log("YouTube cookies loaded for play-dl.");
  } else {
    console.warn(
      "YOUTUBE_COOKIES is not set. YouTube often blocks cloud hosts (e.g. Railway); SoundCloud may still work.",
    );
  }

  try {
    const clientId = await play.getFreeClientID();
    play.setToken({ soundcloud: { client_id: clientId } });
  } catch (error) {
    console.warn("SoundCloud client ID setup failed:", error);
  }
}

export function formatPlayError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Could not play that track.";
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
