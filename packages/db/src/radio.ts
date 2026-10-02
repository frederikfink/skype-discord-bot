export type RadioTrack = {
  id: string;
  title: string;
  url: string;
  durationSeconds: number | null;
};

export type RadioStatePayload = {
  current: RadioTrack | null;
  queue: RadioTrack[];
  isPlaying: boolean;
  /** Unix ms when current track started (for elapsed display) */
  startedAt: number | null;
  updatedAt: number;
};

export function emptyRadioState(): RadioStatePayload {
  return {
    current: null,
    queue: [],
    isPlaying: false,
    startedAt: null,
    updatedAt: Date.now(),
  };
}

export function formatTrackDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "??:??";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
