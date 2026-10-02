/** Client-safe mirror of @repo/db/radio types */
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
  startedAt: number | null;
  updatedAt: number;
};

export function formatTrackDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "??:??";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
