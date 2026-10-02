import play from "play-dl";
import { ensureSoundCloudReady } from "./play-dl-setup.js";
import type { QueueTrack } from "./types.js";

function isSoundCloudQuery(query: string): boolean {
  return /soundcloud\.com/i.test(query);
}

function trackId(url: string): string {
  return url;
}

function ytToTrack(details: { url: string; title?: string; durationInSec?: number }): QueueTrack {
  return {
    id: trackId(details.url),
    title: details.title ?? "Unknown title",
    url: details.url,
    durationSeconds:
      typeof details.durationInSec === "number" && details.durationInSec >= 0
        ? details.durationInSec
        : null,
  };
}

async function resolveUrl(url: string): Promise<QueueTrack[]> {
  const kind = await play.validate(url);

  if (kind === "yt_video") {
    const info = await play.video_info(url);
    return [ytToTrack(info.video_details)];
  }

  if (kind === "yt_playlist") {
    const playlist = await play.playlist_info(url, { incomplete: true });
    const videos = await playlist.all_videos();
    return videos.map((video) => ytToTrack(video));
  }

  if (kind === "so_track") {
    const info = await play.soundcloud(url);
    return [
      {
        id: trackId(info.url),
        title: info.name ?? "Unknown title",
        url: info.url,
        durationSeconds:
          typeof info.durationInSec === "number" && info.durationInSec >= 0
            ? info.durationInSec
            : null,
      },
    ];
  }

  if (kind === "so_playlist") {
    const playlist = await play.playlist_info(url, { incomplete: true });
    const tracks = await playlist.all_videos();
    return tracks.map((track) => ({
      id: trackId(track.url),
      title: track.title ?? "Unknown title",
      url: track.url,
      durationSeconds:
        typeof track.durationInSec === "number" && track.durationInSec >= 0
          ? track.durationInSec
          : null,
    }));
  }

  throw new Error("Unsupported URL. Use a YouTube or SoundCloud link.");
}

async function resolveSearch(query: string): Promise<QueueTrack[]> {
  const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
  if (results.length === 0) {
    throw new Error("No results found for that search.");
  }
  const hit = results[0]!;
  if (!hit.url) {
    throw new Error("No results found for that search.");
  }
  return resolveUrl(hit.url);
}

export async function resolveQuery(query: string): Promise<QueueTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Please provide a URL or search query.");
  }

  if (isSoundCloudQuery(trimmed)) {
    await ensureSoundCloudReady();
  }

  const kind = await play.validate(trimmed);
  if (kind === "search") {
    return resolveSearch(trimmed);
  }
  if (kind === false) {
    throw new Error("Unsupported URL. Use a YouTube or SoundCloud link.");
  }

  return resolveUrl(trimmed);
}
