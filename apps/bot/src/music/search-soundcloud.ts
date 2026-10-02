import play from "play-dl";
import { ensureSoundCloudReady } from "./play-dl-setup.js";

export type SoundCloudSearchHit = {
  id: string;
  title: string;
  url: string;
  durationSeconds: number | null;
  artist: string | null;
  artworkUrl: string | null;
};

export async function searchSoundCloudTracks(
  query: string,
  limit = 15,
): Promise<SoundCloudSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  await ensureSoundCloudReady();

  const capped = Math.min(Math.max(limit, 1), 25);
  const results = await play.search(trimmed, {
    limit: capped,
    source: { soundcloud: "tracks" },
  });

  return results.map((track) => ({
    id: String(track.id),
    title: track.name ?? "Unknown title",
    url: track.url,
    durationSeconds:
      typeof track.durationInSec === "number" && track.durationInSec >= 0
        ? track.durationInSec
        : null,
    artist: track.user?.name ?? track.publisher?.name ?? null,
    artworkUrl: track.thumbnail ?? null,
  }));
}
