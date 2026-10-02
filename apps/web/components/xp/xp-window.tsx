"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { APP_META, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH, type AppId } from "./types";

type XpWindowProps = {
  appId: AppId;
  active: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  surfaceRef: React.RefObject<HTMLElement | null>;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  children: ReactNode;
  statusBar?: ReactNode;
  menubar?: ReactNode;
  toolbar?: ReactNode;
};

const DESKTOP_PADDING = 8;

type DragState = {
  kind: "move";
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type ResizeState = {
  kind: "resize";
  startX: number;
  startY: number;
  originW: number;
  originH: number;
};

export function XpWindow({
  appId,
  active,
  minimized,
  x,
  y,
  width,
  height,
  maximized,
  surfaceRef,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  children,
  statusBar,
  menubar,
  toolbar,
}: XpWindowProps) {
  const meta = APP_META[appId];
  const interactionRef = useRef<DragState | ResizeState | null>(null);

  const clampPosition = useCallback(
    (nextX: number, nextY: number, winWidth: number, winHeight: number) => {
      const surface = surfaceRef.current;
      if (!surface) return { x: nextX, y: nextY };

      const rect = surface.getBoundingClientRect();
      const maxX = Math.max(DESKTOP_PADDING, rect.width - winWidth - DESKTOP_PADDING);
      const maxY = Math.max(DESKTOP_PADDING, rect.height - winHeight - DESKTOP_PADDING);

      return {
        x: Math.min(Math.max(DESKTOP_PADDING, nextX), maxX),
        y: Math.min(Math.max(DESKTOP_PADDING, nextY), maxY),
      };
    },
    [surfaceRef],
  );

  const clampSize = useCallback(
    (nextWidth: number, nextHeight: number, winX: number, winY: number) => {
      const surface = surfaceRef.current;
      if (!surface) {
        return {
          width: Math.max(WINDOW_MIN_WIDTH, nextWidth),
          height: Math.max(WINDOW_MIN_HEIGHT, nextHeight),
        };
      }

      const rect = surface.getBoundingClientRect();
      const maxWidth = rect.width - winX - DESKTOP_PADDING;
      const maxHeight = rect.height - winY - DESKTOP_PADDING;

      return {
        width: Math.min(Math.max(WINDOW_MIN_WIDTH, nextWidth), maxWidth),
        height: Math.min(Math.max(WINDOW_MIN_HEIGHT, nextHeight), maxHeight),
      };
    },
    [surfaceRef],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || maximized) return;

      if (interaction.kind === "move") {
        const dx = event.clientX - interaction.startX;
        const dy = event.clientY - interaction.startY;
        const clamped = clampPosition(
          interaction.originX + dx,
          interaction.originY + dy,
          width,
          height,
        );
        onMove(clamped.x, clamped.y);
        return;
      }

      const dx = event.clientX - interaction.startX;
      const dy = event.clientY - interaction.startY;
      const clamped = clampSize(interaction.originW + dx, interaction.originH + dy, x, y);
      onResize(clamped.width, clamped.height);
    };

    const onPointerUp = () => {
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [clampPosition, clampSize, height, maximized, onMove, onResize, width, x, y]);

  const onTitlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || maximized) return;
    event.preventDefault();
    onFocus();
    interactionRef.current = {
      kind: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
    };
  };

  const onResizePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || maximized) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus();
    interactionRef.current = {
      kind: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originW: width,
      originH: height,
    };
  };

  if (minimized) return null;

  const style = maximized
    ? {
        left: DESKTOP_PADDING,
        top: DESKTOP_PADDING,
        width: `calc(100% - ${DESKTOP_PADDING * 2}px)`,
        height: `calc(100% - ${DESKTOP_PADDING * 2}px)`,
      }
    : {
        left: x,
        top: y,
        width,
        height,
      };

  return (
    <div
      className="xp-window xp-window-floating"
      style={style}
      onMouseDown={(event) => {
        event.stopPropagation();
        onFocus();
      }}
    >
      <div
        className={cn("xp-titlebar", !active && "inactive")}
        onPointerDown={onTitlePointerDown}
        role="presentation"
      >
        <span className="xp-titlebar-icon" aria-hidden>
          {meta.icon}
        </span>
        <span className="xp-titlebar-text">{meta.title}</span>
        <div className="xp-titlebar-buttons">
          <button
            type="button"
            className="xp-winbtn"
            aria-label="Minimize"
            onClick={(event) => {
              event.stopPropagation();
              onMinimize();
            }}
          >
            _
          </button>
          <button
            type="button"
            className="xp-winbtn"
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMaximize();
            }}
          >
            {maximized ? "❐" : "□"}
          </button>
          <button
            type="button"
            className="xp-winbtn xp-winbtn-close"
            aria-label="Close"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>
      </div>
      {menubar}
      {toolbar}
      <div className={cn("xp-client", maximized && "xp-client-maximized")}>{children}</div>
      {statusBar}
      {!maximized ? (
        <div
          className="xp-resize-handle"
          onPointerDown={onResizePointerDown}
          aria-hidden
          title="Resize"
        />
      ) : null}
    </div>
  );
}
