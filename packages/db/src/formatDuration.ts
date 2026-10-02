export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) {
    return `${hours}h`;
  }

  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m`;
}
