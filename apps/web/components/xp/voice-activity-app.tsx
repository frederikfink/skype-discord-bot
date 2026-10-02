import { PeriodFilter } from "@/components/period-filter";
import type { LeaderboardEntry } from "@/lib/stats-types";
import { formatDuration } from "@repo/db/formatDuration";
import { periodLabels, type Period } from "@repo/db/periods";

export function VoiceActivityMenubar() {
  return (
    <div className="xp-menubar" aria-hidden>
      <span>
        <u>F</u>ile
      </span>
      <span>
        <u>E</u>dit
      </span>
      <span>
        <u>V</u>iew
      </span>
      <span>
        <u>H</u>elp
      </span>
    </div>
  );
}

export function VoiceActivityToolbar({ period }: { period: Period }) {
  return (
    <div className="xp-toolbar">
      <span className="xp-toolbar-label">Show stats for:</span>
      <PeriodFilter current={period} />
    </div>
  );
}

export function VoiceActivityApp({
  period,
  entries,
}: {
  period: Period;
  entries: LeaderboardEntry[];
}) {
  return (
    <div className="xp-groupbox">
      <span className="xp-groupbox-legend">{periodLabels[period]}</span>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-[#444]">No voice data recorded yet.</p>
      ) : (
        <table className="xp-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Member</th>
              <th className="text-right">Time in voice</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.userId}>
                <td>{index + 1}</td>
                <td>{entry.username}</td>
                <td className="text-right font-mono tabular-nums">
                  {formatDuration(entry.totalMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function VoiceActivityStatus({ count }: { count: number }) {
  return (
    <div className="xp-statusbar">
      <span className="xp-statusbar-panel">Ready</span>
      <span className="xp-statusbar-panel fixed">
        {count} member{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}
