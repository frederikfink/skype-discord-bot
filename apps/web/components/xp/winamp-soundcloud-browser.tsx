"use client";

import { formatTrackDuration } from "@/lib/radio-types";
import type { SoundCloudSearchHit } from "@/lib/soundcloud-browse-types";
import { useState, type FormEvent } from "react";

type Props = {
  onQueued?: () => void;
};

export function WinampSoundCloudBrowser({ onQueued }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SoundCloudSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [queueingId, setQueueingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    if (!q || searching) return;

    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/radio/search?q=${encodeURIComponent(q)}&limit=20`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { results?: SoundCloudSearchHit[]; error?: string };
      if (!res.ok) {
        setResults([]);
        setMessage(data.error ?? "Search failed");
        return;
      }
      setResults(data.results ?? []);
      setSelectedIndex(0);
      if ((data.results?.length ?? 0) === 0) {
        setMessage("No tracks found — try different words.");
      }
    } catch {
      setResults([]);
      setMessage("Could not reach /api/radio/search.");
    } finally {
      setSearching(false);
    }
  }

  async function queueTrack(hit: SoundCloudSearchHit) {
    if (queueingId) return;
    setQueueingId(hit.id);
    setMessage(null);
    try {
      const res = await fetch("/api/radio/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hit.url }),
      });
      const data = (await res.json()) as { error?: string; enqueued?: number };
      if (!res.ok) {
        setMessage(data.error ?? "Could not queue track.");
        return;
      }
      setMessage(`Queued: ${hit.title}`);
      onQueued?.();
    } catch {
      setMessage("Could not reach /api/radio/play.");
    } finally {
      setQueueingId(null);
    }
  }

  return (
    <div className="winamp-browse">
      <div className="winamp-browse-title">Media Library — SoundCloud</div>
      <form className="winamp-browse-search" onSubmit={(e) => void runSearch(e)}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists, tracks…"
          aria-label="SoundCloud search"
          className="winamp-browse-input"
        />
        <button type="submit" className="winamp-btn winamp-browse-go" disabled={searching || !query.trim()}>
          {searching ? "…" : "Go"}
        </button>
      </form>
      <ol className="winamp-browse-list">
        {results.map((hit, index) => (
          <li key={hit.id}>
            <button
              type="button"
              className={`winamp-browse-item${index === selectedIndex ? " selected" : ""}`}
              onClick={() => setSelectedIndex(index)}
              onDoubleClick={() => void queueTrack(hit)}
              disabled={queueingId === hit.id}
            >
              <span className="winamp-browse-track">
                {hit.artist ? `${hit.artist} — ` : ""}
                {hit.title}
              </span>
              <span className="winamp-browse-dur">{formatTrackDuration(hit.durationSeconds)}</span>
            </button>
            <button
              type="button"
              className="winamp-browse-add"
              title="Add to Discord queue"
              disabled={queueingId === hit.id}
              onClick={() => void queueTrack(hit)}
            >
              +
            </button>
          </li>
        ))}
      </ol>
      <p className="winamp-browse-hint">
        {message ??
          "Double-click or + to queue. Bot joins your last voice channel or MUSIC_VOICE_CHANNEL_ID."}
      </p>
    </div>
  );
}
