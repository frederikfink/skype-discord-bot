export const APP_IDS = ["voice", "debug", "winamp", "cocio", "broed"] as const;
export type AppId = (typeof APP_IDS)[number];

export type WindowChrome = "xp" | "winamp";

export type WindowRecord = {
  appId: AppId;
  open: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  memeImageUrl?: string;
};

export const WINDOW_MIN_WIDTH = 280;
export const WINDOW_MIN_HEIGHT = 160;

export const WINAMP_MIN_WIDTH = 240;
export const WINAMP_MIN_HEIGHT = 200;

export const APP_META: Record<
  AppId,
  {
    title: string;
    shortTitle: string;
    icon: string;
    desktopIcon: string;
    desktopLabel: string;
    chrome: WindowChrome;
  }
> = {
  voice: {
    title: "Voice Activity Leaderboard — Skype ApS",
    shortTitle: "Voice Activity",
    icon: "🔊",
    desktopIcon: "🔊",
    desktopLabel: "Voice Activity",
    chrome: "xp",
  },
  debug: {
    title: "Debug Information",
    shortTitle: "Debug Information",
    icon: "🛠",
    desktopIcon: "🛠",
    desktopLabel: "Debug Info",
    chrome: "xp",
  },
  winamp: {
    title: "WINAMP",
    shortTitle: "Winamp",
    icon: "🎵",
    desktopIcon: "🎵",
    desktopLabel: "Winamp",
    chrome: "winamp",
  },
  cocio: {
    title: "Cocio™ — Windows Picture and Fax Viewer",
    shortTitle: "Cocio.lnk",
    icon: "🥛",
    desktopIcon: "🥛",
    desktopLabel: "Cocio.lnk",
    chrome: "xp",
  },
  broed: {
    title: "Snacks.exe — Windows Picture and Fax Viewer",
    shortTitle: "Snacks.exe",
    icon: "🥖",
    desktopIcon: "🥖",
    desktopLabel: "Snacks.exe",
    chrome: "xp",
  },
};

export const DEFAULT_WINDOWS: Record<AppId, Omit<WindowRecord, "appId">> = {
  voice: {
    open: false,
    minimized: false,
    x: 48,
    y: 32,
    width: 420,
    height: 380,
    maximized: false,
  },
  debug: {
    open: false,
    minimized: false,
    x: 96,
    y: 120,
    width: 400,
    height: 320,
    maximized: false,
  },
  winamp: {
    open: false,
    minimized: false,
    x: 520,
    y: 48,
    width: 275,
    height: 340,
    maximized: false,
  },
  cocio: {
    open: false,
    minimized: false,
    x: 140,
    y: 64,
    width: 520,
    height: 420,
    maximized: false,
  },
  broed: {
    open: false,
    minimized: false,
    x: 200,
    y: 100,
    width: 520,
    height: 420,
    maximized: false,
  },
};

export const DESKTOP_ICON_LAYOUT: Record<AppId, { x: number; y: number }> = {
  voice: { x: 16, y: 16 },
  debug: { x: 16, y: 96 },
  winamp: { x: 16, y: 176 },
  cocio: { x: 16, y: 256 },
  broed: { x: 16, y: 336 },
};
