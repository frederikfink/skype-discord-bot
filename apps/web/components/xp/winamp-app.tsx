"use client";

import {
  formatTrackDuration,
  radioElapsedMs,
  type RadioStatePayload,
} from "@/lib/radio-types";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { WinampSoundCloudBrowser } from "./winamp-soundcloud-browser";
import { WinampVisualizer } from "./winamp-visualizer";

type DisplayTrack = {
  id: string;
  title: string;
  duration: string;
};

const PLACEHOLDER: DisplayTrack[] = [
  { id: "idle", title: "Music Bot — Nothing playing", duration: "0:00" },
];

const WACKY_KBPS = ["128", "320", "∞", "1337", "42", "9001"] as const;
const VIZ_MODES = ["OSC", "SPC", "MIX", "WTF"] as const;

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
  const [showBrowse, setShowBrowse] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [kbpsIndex, setKbpsIndex] = useState(0);
  const [vizModeIndex, setVizModeIndex] = useState(0);
  const [spectrum, setSpectrum] = useState<number[]>(() => Array.from({ length: 24 }, () => 0.2));
  const [controlBusy, setControlBusy] = useState(false);

  const tracks = useMemo(() => tracksFromRadio(radio), [radio]);
  const isPlaying = radio?.isPlaying ?? false;
  const isPaused = radio?.isPaused ?? false;
  const currentTrack = tracks[trackIndex] ?? tracks[0]!;
  const hasLiveTrack = Boolean(radio?.current);
  const hasActivePlayback = hasLiveTrack && (isPlaying || isPaused);
  const remoteControl = true;
  const trackKey = radio?.current?.id ?? "idle";

  const playlistHint = fetchError
    ? "Could not load /api/radio."
    : !hasLiveTrack && radio?.syncedWithBot === false
      ? "No radio data. Set BOT_RADIO_URL to your Railway bot URL (see README), or run bot + web against the same bot.db locally."
      : !hasLiveTrack
        ? "Nothing playing — use /play in Discord."
        : "Live queue from the Discord music bot";

  async function loadRadio() {
    try {
      const res = await fetch("/api/radio", { cache: "no-store" });
      if (!res.ok) throw new Error("radio fetch failed");
      const data = (await res.json()) as RadioStatePayload;
      setRadio(data);
      setFetchError(false);
    } catch {
      setFetchError(true);
    }
  }

  useEffect(() => {
    void loadRadio();
    const id = window.setInterval(() => void loadRadio(), 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setTrackIndex(0);
  }, [radio?.current?.id, radio?.updatedAt]);

  useEffect(() => {
    if (!hasLiveTrack || !radio) {
      setElapsed(0);
      return;
    }

    const tick = () => {
      setElapsed(Math.max(0, Math.floor(radioElapsedMs(radio) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, isPlaying ? 500 : 2000);
    return () => window.clearInterval(id);
  }, [
    hasLiveTrack,
    isPlaying,
    radio?.startedAt,
    radio?.positionMs,
    radio?.current?.id,
    radio?.isPlaying,
  ]);

  async function sendPlaybackControl(action: "pause" | "resume") {
    if (controlBusy) return;
    setControlBusy(true);
    try {
      const res = await fetch("/api/radio/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = (await res.json()) as { state?: RadioStatePayload };
        if (data.state) setRadio(data.state);
      }
    } finally {
      setControlBusy(false);
    }
  }

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setKbpsIndex((i) => (i + 1) % WACKY_KBPS.length);
      setVizModeIndex((i) => (i + 1) % VIZ_MODES.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setSpectrum(Array.from({ length: 24 }, () => 0.15));
      return;
    }
    const id = window.setInterval(() => {
      setSpectrum(
        Array.from({ length: 24 }, (_, i) => {
          const base = 0.2 + Math.sin(Date.now() / 200 + i) * 0.25;
          return Math.min(1, base + Math.random() * 0.55);
        }),
      );
    }, 80);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const marqueeSuffix = fetchError
    ? "Could not reach /api/radio"
    : !hasLiveTrack && radio?.syncedWithBot === false
      ? "Not linked to prod bot DB — see playlist hint below"
      : isPlaying
        ? "★ SKYPE ApS MEGA RADIO ★ DISCORD DJ ONLY ★ WHIPS THE LLAMA ★"
        : isPaused
          ? "PAUSED — hit ▶ in Winamp or /resume in Discord"
          : "Control playback from Discord (/play, /skip, /stop) or Winamp ▶/⏸";

  const lcdClass = isPlaying ? "winamp-lcd winamp-lcd-rave" : "winamp-lcd";
  const kbps = WACKY_KBPS[kbpsIndex];
  const vizMode = VIZ_MODES[vizModeIndex];

  return (
    <div className={`winamp${isPlaying ? " winamp-party" : ""}`}>
      <div className="winamp-main">
        <div className="winamp-display-row">
          <div className={lcdClass}>
            <div className="winamp-lcd-meta">
              <span className="winamp-blink">{isPlaying ? "▶" : isPaused ? "⏸" : "■"}</span>
              <span className="winamp-kbps-flash">{kbps}</span>
              <span>kbps</span>
              <span>{isPlaying ? "48" : "44"}</span>
              <span>kHz</span>
              <span className="winamp-stereo">{isPlaying ? "MONO? STEREO!" : "stereo"}</span>
              <span className="winamp-viz-mode">{vizMode}</span>
            </div>
            <div className="winamp-lcd-time">{formatElapsed(elapsed)}</div>
            <div className="winamp-lcd-sub">
              {isPlaying ? "NOW WHIPPING:" : isPaused ? "PAUSED:" : "STBY:"}{" "}
              {currentTrack.title.slice(0, 42)}
            </div>
          </div>
          <div className={`winamp-viz winamp-viz-mini${isPlaying ? " active" : ""}`}>
            {spectrum.slice(0, 12).map((h, bar) => (
              <span
                key={bar}
                className="winamp-viz-bar"
                style={{
                  height: `${Math.round(h * 100)}%`,
                  animationDelay: `${(bar % 7) * 0.05}s`,
                }}
              />
            ))}
          </div>
        </div>

        <WinampVisualizer active={isPlaying} trackKey={trackKey} />

        <div className={`winamp-spectrum-row${isPlaying ? " active" : ""}`}>
          {spectrum.map((h, i) => (
            <span
              key={i}
              className="winamp-spectrum-bar"
              style={{ "--h": h } as CSSProperties}
            />
          ))}
        </div>

        <div className="winamp-marquee-wrap">
          <p className={`winamp-marquee${isPlaying ? " scrolling wacky" : ""}`}>
            {isPlaying ? (
              <>
                {currentTrack.title} *** {marqueeSuffix} *** {currentTrack.title} ***{" "}
                {marqueeSuffix} ***
              </>
            ) : (
              <>
                {currentTrack.title} *** {marqueeSuffix} ***
              </>
            )}
          </p>
        </div>

        <div className="winamp-seek">
          <input
            type="range"
            min={0}
            max={100}
            value={
              radio?.current?.durationSeconds
                ? Math.min(100, (elapsed / radio.current.durationSeconds) * 100)
                : Math.min(elapsed, 100)
            }
            readOnly
            aria-label="Seek"
            className={isPlaying ? "winamp-seek-glow" : undefined}
          />
        </div>

        <div className="winamp-controls">
          <button type="button" className="winamp-btn" disabled title="Use /skip in Discord">
            ⏮
          </button>
          <button
            type="button"
            className="winamp-btn"
            disabled={!isPaused || !hasLiveTrack || controlBusy}
            title={isPaused ? "Resume" : "Nothing paused"}
            onClick={() => void sendPlaybackControl("resume")}
          >
            ▶
          </button>
          <button
            type="button"
            className="winamp-btn"
            disabled={!isPlaying || controlBusy}
            title={isPlaying ? "Pause" : "Not playing"}
            onClick={() => void sendPlaybackControl("pause")}
          >
            ⏸
          </button>
          <button type="button" className="winamp-btn" disabled title="Use /stop in Discord">
            ⏹
          </button>
          <button type="button" className="winamp-btn" disabled title="Use /skip in Discord">
            ⏭
          </button>
          <button
            type="button"
            className={`winamp-btn winamp-toggle${showBrowse ? " on" : ""}`}
            onClick={() => setShowBrowse((v) => !v)}
            title="SoundCloud browser"
          >
            ML
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

      {showBrowse ? <WinampSoundCloudBrowser onQueued={() => void loadRadio()} /> : null}

      {showPlaylist ? (
        <div className="winamp-playlist">
          <div className="winamp-playlist-title">
            Playlist — {tracks.length} tracks {isPlaying ? "🔥" : ""}
          </div>
          <ol className="winamp-playlist-list">
            {tracks.map((track, index) => (
              <li key={track.id}>
                <button
                  type="button"
                  className={`winamp-playlist-item${index === trackIndex ? " selected" : ""}${index === 0 && hasActivePlayback ? " playing" : ""}`}
                  onClick={() => setTrackIndex(index)}
                  disabled={remoteControl}
                >
                  <span className="winamp-playlist-track">
                    {index === 0 && isPlaying ? "♪ " : index === 0 && isPaused ? "⏸ " : ""}
                    {track.title}
                  </span>
                  <span className="winamp-playlist-dur">{track.duration}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="winamp-playlist-hint">{playlistHint}</p>
        </div>
      ) : null}
    </div>
  );
}
