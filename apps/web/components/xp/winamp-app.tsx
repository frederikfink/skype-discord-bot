"use client";

import { formatTrackDuration, type RadioStatePayload } from "@/lib/radio-types";
import { useEffect, useMemo, useState } from "react";

type DisplayTrack = {
  id: string;
  title: string;
  duration: string;
};

const PLACEHOLDER: DisplayTrack[] = [
  { id: "idle", title: "Music Bot — Nothing playing", duration: "0:00" },
];

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function tracksFromRadio(state: RadioStatePayload | null): DisplayTrack[] {
  if (!state?.current && state?.queue.length === 0) {
    return PLACEHOLDER;
  }

  const list: DisplayTrack[] = [];
  if (state?.current) {
    list.push({
      id: state.current.id,
      title: state.current.title,
      duration: formatTrackDuration(state.current.durationSeconds),
    });
  }
  for (const track of state?.queue ?? []) {
    list.push({
      id: track.id,
      title: track.title,
      duration: formatTrackDuration(track.durationSeconds),
    });
  }
  return list.length > 0 ? list : PLACEHOLDER;
}

export function WinampApp() {
  const [radio, setRadio] = useState<RadioStatePayload | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(85);
  const [balance, setBalance] = useState(50);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const tracks = useMemo(() => tracksFromRadio(radio), [radio]);
  const isPlaying = radio?.isPlaying ?? false;
  const isPaused = false;
  const currentTrack = tracks[trackIndex] ?? tracks[0]!;
  const statusLabel = isPlaying ? "Playing" : "Stopped";
  const remoteControl = true;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/radio", { cache: "no-store" });
        if (!res.ok) throw new Error("radio fetch failed");
        const data = (await res.json()) as RadioStatePayload;
        if (!cancelled) {
          setRadio(data);
          setFetchError(false);
        }
      } catch {
        if (!cancelled) setFetchError(true);
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setTrackIndex(0);
  }, [radio?.current?.id, radio?.updatedAt]);

  useEffect(() => {
    if (!isPlaying || !radio?.startedAt) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - radio.startedAt!) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, radio?.startedAt, radio?.current?.id]);

  const vizBars = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);

  const marqueeSuffix = fetchError
    ? "Could not reach /api/radio"
    : remoteControl
      ? "Control playback from Discord (/play, /skip, /stop)"
      : statusLabel;

  return (
    <div className="winamp">
      <div className="winamp-main">
        <div className="winamp-display-row">
          <div className="winamp-lcd">
            <div className="winamp-lcd-meta">
              <span>{isPlaying && !isPaused ? "▶" : "■"}</span>
              <span>128</span>
              <span>kbps</span>
              <span>44</span>
              <span>kHz</span>
              <span className="winamp-stereo">stereo</span>
            </div>
            <div className="winamp-lcd-time">{formatElapsed(elapsed)}</div>
          </div>
          <div className={`winamp-viz${isPlaying && !isPaused ? " active" : ""}`}>
            {vizBars.map((bar) => (
              <span
                key={bar}
                className="winamp-viz-bar"
                style={{ animationDelay: `${(bar % 7) * 0.07}s` }}
              />
            ))}
          </div>
        </div>

        <div className="winamp-marquee-wrap">
          <p className={`winamp-marquee${isPlaying && !isPaused ? " scrolling" : ""}`}>
            {currentTrack.title} *** {marqueeSuffix} ***
          </p>
        </div>

        <div className="winamp-seek">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.min(elapsed, 100)}
            readOnly
            aria-label="Seek"
          />
        </div>

        <div className="winamp-controls">
          <button type="button" className="winamp-btn" disabled title="Use /skip in Discord">
            ⏮
          </button>
          <button type="button" className="winamp-btn" disabled title="Use /play in Discord">
            ▶
          </button>
          <button type="button" className="winamp-btn" disabled title="Pause not available">
            ⏸
          </button>
          <button type="button" className="winamp-btn" disabled title="Use /stop in Discord">
            ⏹
          </button>
          <button type="button" className="winamp-btn" disabled title="Use /skip in Discord">
            ⏭
          </button>
          <button type="button" className="winamp-btn winamp-toggle" disabled title="Discord only">
            SHF
          </button>
          <button type="button" className="winamp-btn winamp-toggle" disabled title="Discord only">
            RPT
          </button>
          <button
            type="button"
            className={`winamp-btn winamp-toggle${showPlaylist ? " on" : ""}`}
            onClick={() => setShowPlaylist((v) => !v)}
            title="Playlist"
          >
            PL
          </button>
        </div>

        <div className="winamp-sliders">
          <label className="winamp-slider-label">
            vol
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <label className="winamp-slider-label">
            bal
            <input
              type="range"
              min={0}
              max={100}
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {showPlaylist ? (
        <div className="winamp-playlist">
          <div className="winamp-playlist-title">Playlist — {tracks.length} tracks</div>
          <ol className="winamp-playlist-list">
            {tracks.map((track, index) => (
              <li key={track.id}>
                <button
                  type="button"
                  className={`winamp-playlist-item${index === trackIndex ? " selected" : ""}`}
                  onClick={() => setTrackIndex(index)}
                  disabled={remoteControl}
                >
                  <span className="winamp-playlist-track">{track.title}</span>
                  <span className="winamp-playlist-dur">{track.duration}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="winamp-playlist-hint">Live queue from the Discord music bot</p>
        </div>
      ) : null}
    </div>
  );
}
