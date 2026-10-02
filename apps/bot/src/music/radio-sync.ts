import type { StatsDatabase } from "@repo/db";
import type { QueueTrack } from "./types.js";

export function syncRadioState(
  db: StatsDatabase,
  state: {
    current: QueueTrack | null;
    queue: QueueTrack[];
    isPlaying: boolean;
    isPaused: boolean;
    startedAt: number | null;
    positionMs: number;
  },
): void {
  db.setRadioState({
    current: state.current,
    queue: state.queue,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    startedAt: state.startedAt,
    positionMs: state.positionMs,
    updatedAt: Date.now(),
  });
}
