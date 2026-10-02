"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { WINAMP_MIN_HEIGHT, WINAMP_MIN_WIDTH } from "./types";
import { WinampApp } from "./winamp-app";

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

type WinampWindowProps = {
  active: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  surfaceRef: React.RefObject<HTMLElement | null>;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  children?: ReactNode;
};

export function WinampWindow({
  active,
  minimized,
  x,
  y,
  width,
  height,
  surfaceRef,
  onFocus,
  onClose,
  onMinimize,
  onMove,
  onResize,
  children,
}: WinampWindowProps) {
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
          width: Math.max(WINAMP_MIN_WIDTH, nextWidth),
          height: Math.max(WINAMP_MIN_HEIGHT, nextHeight),
        };
      }

      const rect = surface.getBoundingClientRect();
      const maxWidth = rect.width - winX - DESKTOP_PADDING;
      const maxHeight = rect.height - winY - DESKTOP_PADDING;

      return {
        width: Math.min(Math.max(WINAMP_MIN_WIDTH, nextWidth), maxWidth),
        height: Math.min(Math.max(WINAMP_MIN_HEIGHT, nextHeight), maxHeight),
      };
    },
    [surfaceRef],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

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
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [clampPosition, clampSize, height, onMove, onResize, width, x, y]);

  const onTitlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
    };
  };

  const onResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      kind: "resize",
      startX: event.clientX,
      startY: event.clientY,
      originW: width,
      originH: height,
    };
  };

  if (minimized) return null;

  return (
    <div
      className="winamp-window"
      style={{ left: x, top: y, width, height }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onFocus();
      }}
    >
      <div
        className={`winamp-titlebar${active ? "" : " inactive"}`}
        onPointerDown={onTitlePointerDown}
        role="presentation"
      >
        <span className="winamp-titlebar-logo" aria-hidden>
          ⚡
        </span>
        <span className="winamp-titlebar-text">WINAMP</span>
        <div className="winamp-titlebar-buttons">
          <button
            type="button"
            className="winamp-chrome-btn"
            aria-label="Minimize"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
          >
            _
          </button>
          <button
            type="button"
            className="winamp-chrome-btn winamp-chrome-btn-close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div className="winamp-body">{children ?? <WinampApp />}</div>
      <div className="winamp-resize-handle" onPointerDown={onResizePointerDown} aria-hidden />
    </div>
  );
}
