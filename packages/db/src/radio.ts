export type RadioTrack = {
  id: string;
  title: string;
  url: string;
  durationSeconds: number | null;
};

export type RadioStatePayload = {
  current: RadioTrack | null;
  queue: RadioTrack[];
  /** Audio is actively playing (not paused) */
  isPlaying: boolean;
  isPaused: boolean;
  /** Unix ms when the current playback segment started (null while paused) */
  startedAt: number | null;
  /** Elapsed ms in the current track before the current segment */
  positionMs: number;
  updatedAt: number;
};

export function emptyRadioState(): RadioStatePayload {
  return {
    current: null,
    queue: [],
    isPlaying: false,
    isPaused: false,
    startedAt: null,
    positionMs: 0,
    updatedAt: Date.now(),
  };
}

export function radioElapsedMs(state: Pick<RadioStatePayload, "isPlaying" | "startedAt" | "positionMs">): number {
  if (state.isPlaying && state.startedAt !== null) {
    return state.positionMs + Math.max(0, Date.now() - state.startedAt);
  }
  return state.positionMs;
}

export function formatTrackDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "??:??";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
