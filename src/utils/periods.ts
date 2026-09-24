export type Period = "day" | "week" | "month" | "ytd" | "all";

export const periodLabels: Record<Period, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  ytd: "Year to Date",
  all: "All Time",
};

function getTimezone(): string {
  return process.env.TIMEZONE ?? "Europe/Copenhagen";
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  let timestamp = utcGuess;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const localAsUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    timestamp += utcGuess - localAsUtc;
  }

  return timestamp;
}

function getZonedDateParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(timestamp));

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

function startOfDay(timestamp: number, timeZone: string): number {
  const { year, month, day } = getZonedDateParts(timestamp, timeZone);
  return zonedDateTimeToUtc(year, month, day, 0, 0, 0, timeZone);
}

function addDays(year: number, month: number, day: number, days: number) {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

const weekdayIndex: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function getPeriodStartMs(period: Period, now = Date.now()): number | null {
  if (period === "all") return null;

  const timeZone = getTimezone();
  const { year, month, day, weekday } = getZonedDateParts(now, timeZone);

  switch (period) {
    case "day":
      return startOfDay(now, timeZone);
    case "week": {
      const daysFromMonday = weekdayIndex[weekday] ?? 0;
      const monday = addDays(year, month, day, -daysFromMonday);
      return zonedDateTimeToUtc(monday.year, monday.month, monday.day, 0, 0, 0, timeZone);
    }
    case "month":
      return zonedDateTimeToUtc(year, month, 1, 0, 0, 0, timeZone);
    case "ytd":
      return zonedDateTimeToUtc(year, 1, 1, 0, 0, 0, timeZone);
  }
}

export function parsePeriod(value: string | null): Period {
  if (value === "day" || value === "week" || value === "month" || value === "ytd" || value === "all") {
    return value;
  }
  return "all";
}
