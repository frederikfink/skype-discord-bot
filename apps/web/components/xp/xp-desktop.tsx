"use client";

import type { LeaderboardEntry } from "@/lib/stats-types";
import type { Period } from "@repo/db/periods";
import { useCallback, useRef, useState } from "react";
import { DesktopCharacters } from "./desktop-characters";
import { DebugApp, DebugStatus } from "./debug-app";
import { isMemeApp, pickRandomMeme } from "./meme-images";
import { MemeViewerApp, MemeViewerStatus } from "./meme-viewer-app";
import {
  APP_IDS,
  APP_META,
  DEFAULT_WINDOWS,
  DESKTOP_ICON_LAYOUT,
  type AppId,
  type WindowRecord,
} from "./types";
import {
  VoiceActivityApp,
  VoiceActivityMenubar,
  VoiceActivityStatus,
  VoiceActivityToolbar,
} from "./voice-activity-app";
import { WinampWindow } from "./winamp-window";
import { XpTrayClock } from "./xp-tray-clock";
import { XpWindow } from "./xp-window";

type XpDesktopProps = {
  period: Period;
  entries: LeaderboardEntry[];
  debugPayload: unknown;
};

function buildInitialWindows(): Record<AppId, WindowRecord> {
  return Object.fromEntries(
    APP_IDS.map((appId) => [appId, { appId, ...DEFAULT_WINDOWS[appId] }]),
  ) as Record<AppId, WindowRecord>;
}

export function XpDesktop({ period, entries, debugPayload }: XpDesktopProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [windows, setWindows] = useState(buildInitialWindows);
  const [focusedApp, setFocusedApp] = useState<AppId | null>(null);
  const [zOrder, setZOrder] = useState<AppId[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<AppId | null>(null);

  const bringToFront = useCallback((appId: AppId) => {
    setFocusedApp(appId);
    setZOrder((prev) => [...prev.filter((id) => id !== appId), appId]);
  }, []);

  const updateWindow = useCallback((appId: AppId, patch: Partial<WindowRecord>) => {
    setWindows((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], ...patch },
    }));
  }, []);

  const openApp = useCallback(
    (appId: AppId) => {
      setWindows((prev) => {
        const wasClosed = !prev[appId].open;
        const patch: Partial<WindowRecord> = {
          open: true,
          minimized: false,
        };
        if (isMemeApp(appId) && wasClosed) {
          patch.memeImageUrl = pickRandomMeme();
        }
        return {
          ...prev,
          [appId]: {
            ...prev[appId],
            ...patch,
          },
        };
      });
      bringToFront(appId);
    },
    [bringToFront],
  );

  const closeApp = useCallback((appId: AppId) => {
    setWindows((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], open: false, minimized: false, maximized: false },
    }));
    setFocusedApp((current) => (current === appId ? null : current));
    setZOrder((prev) => prev.filter((id) => id !== appId));
  }, []);

  const minimizeApp = useCallback((appId: AppId) => {
    updateWindow(appId, { minimized: true });
    setFocusedApp(null);
  }, [updateWindow]);

  const taskbarClick = useCallback(
    (appId: AppId) => {
      const win = windows[appId];
      if (!win.open) {
        openApp(appId);
        return;
      }
      if (win.minimized) {
        updateWindow(appId, { minimized: false });
        bringToFront(appId);
        return;
      }
      if (focusedApp === appId) {
        minimizeApp(appId);
        return;
      }
      bringToFront(appId);
    },
    [bringToFront, focusedApp, minimizeApp, openApp, updateWindow, windows],
  );

  const onDesktopBackgroundClick = () => {
    setSelectedIcon(null);
    setFocusedApp(null);
  };

  const onIconClick = (appId: AppId) => {
    setSelectedIcon(appId);
  };

  const onIconDoubleClick = (appId: AppId) => {
    openApp(appId);
  };

  const openApps = APP_IDS.filter((id) => windows[id].open);
  const sortedOpenApps = [...openApps].sort(
    (a, b) => zOrder.indexOf(a) - zOrder.indexOf(b),
  );

  const renderWindow = (appId: AppId, active: boolean, win: WindowRecord) => {
    const common = {
      minimized: win.minimized,
      x: win.x,
      y: win.y,
      width: win.width,
      height: win.height,
      surfaceRef,
      onFocus: () => bringToFront(appId),
      onClose: () => closeApp(appId),
      onMinimize: () => minimizeApp(appId),
      onMove: (x: number, y: number) => updateWindow(appId, { x, y }),
      onResize: (width: number, height: number) => updateWindow(appId, { width, height }),
    };

    if (APP_META[appId].chrome === "winamp") {
      return <WinampWindow active={active} {...common} />;
    }

    return (
      <XpWindow
        appId={appId}
        active={active}
        maximized={win.maximized}
        onToggleMaximize={() =>
          updateWindow(appId, { maximized: !win.maximized, minimized: false })
        }
        menubar={appId === "voice" ? <VoiceActivityMenubar /> : undefined}
        toolbar={appId === "voice" ? <VoiceActivityToolbar period={period} /> : undefined}
        statusBar={
          appId === "voice" ? (
            <VoiceActivityStatus count={entries.length} />
          ) : isMemeApp(appId) ? (
            <MemeViewerStatus />
          ) : (
            <DebugStatus />
          )
        }
        {...common}
      >
        {appId === "voice" ? (
          <VoiceActivityApp period={period} entries={entries} />
        ) : isMemeApp(appId) && win.memeImageUrl ? (
          <MemeViewerApp src={win.memeImageUrl} alt={APP_META[appId].shortTitle} />
        ) : appId === "debug" ? (
          <DebugApp payload={debugPayload} />
        ) : null}
      </XpWindow>
    );
  };

  return (
    <div className="xp-desktop">
      <div
        ref={surfaceRef}
        className="xp-desktop-surface"
        onMouseDown={onDesktopBackgroundClick}
      >
        <DesktopCharacters />

        {APP_IDS.map((appId) => {
          const layout = DESKTOP_ICON_LAYOUT[appId];
          const meta = APP_META[appId];
          return (
            <button
              key={appId}
              type="button"
              className={`xp-desktop-icon xp-desktop-icon-btn${selectedIcon === appId ? " selected" : ""}`}
              style={{ left: layout.x, top: layout.y }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => onIconClick(appId)}
              onDoubleClick={() => onIconDoubleClick(appId)}
            >
              <span className="xp-desktop-icon-emoji" aria-hidden>
                {meta.desktopIcon}
              </span>
              <span>{meta.desktopLabel}</span>
            </button>
          );
        })}

        {sortedOpenApps.map((appId) => {
          const win = windows[appId];
          const active = focusedApp === appId && !win.minimized;

          return (
            <div
              key={appId}
              className="xp-window-layer"
              style={{ zIndex: 10 + zOrder.indexOf(appId) }}
            >
              {renderWindow(appId, active, win)}
            </div>
          );
        })}
      </div>

      <div className="xp-taskbar">
        <div className="xp-start">
          <span aria-hidden>🪟</span> start
        </div>
        <div className="xp-taskbar-items">
          {openApps.map((appId) => {
            const meta = APP_META[appId];
            const win = windows[appId];
            const pressed = focusedApp === appId && !win.minimized;
            return (
              <button
                key={appId}
                type="button"
                className={`xp-taskbar-item${pressed ? " pressed" : ""}`}
                onClick={() => taskbarClick(appId)}
              >
                <span aria-hidden>{meta.icon}</span>
                {meta.shortTitle}
              </button>
            );
          })}
        </div>
        <XpTrayClock />
      </div>
    </div>
  );
}
