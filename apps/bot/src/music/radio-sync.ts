import type { StatsDatabase } from "@repo/db";
import type { QueueTrack } from "./types.js";

export function syncRadioState(
  db: StatsDatabase,
  state: {
    current: QueueTrack | null;
    queue: QueueTrack[];
    isPlaying: boolean;
    startedAt: number | null;
  },
): void {
  db.setRadioState({
    current: state.current,
    queue: state.queue,
    isPlaying: state.isPlaying,
    startedAt: state.startedAt,
    updatedAt: Date.now(),
  });
}
