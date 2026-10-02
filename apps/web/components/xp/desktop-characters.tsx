"use client";

import type {
  VoicePresenceMember,
  VoicePresencePayload,
} from "@/lib/voice-presence-types";
import { useEffect, useMemo, useState } from "react";

type PlacedCharacter = VoicePresenceMember & {
  channelName: string;
  leftPct: number;
  bottomPct: number;
  animDelayMs: number;
  facing: "left" | "right";
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function flattenPresence(payload: VoicePresencePayload | null): PlacedCharacter[] {
  if (!payload) return [];

  const members: Array<VoicePresenceMember & { channelName: string }> = [];
  for (const room of payload.rooms) {
    for (const member of room.members) {
      members.push({ ...member, channelName: room.channelName });
    }
  }

  members.sort((a, b) => a.username.localeCompare(b.username));

  const count = members.length;
  if (count === 0) return [];

  return members.map((member, index) => {
    const hash = hashString(member.userId);
    const slot = (index + 0.5) / count;
    const jitter = ((hash % 1000) / 1000 - 0.5) * 8;
    const leftPct = Math.min(92, Math.max(6, slot * 84 + 8 + jitter));
    const bottomPct = 8 + (hash % 14) + (index % 3) * 2;

    return {
      ...member,
      leftPct,
      bottomPct,
      animDelayMs: hash % 2400,
      facing: hash % 2 === 0 ? "left" : "right",
    };
  });
}

export function DesktopCharacters() {
  const [presence, setPresence] = useState<VoicePresencePayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/voice-presence", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as VoicePresencePayload;
        if (!cancelled) {
          setPresence(data);
          setLoaded(true);
        }
      } catch {
        /* ignore — desktop still usable without live characters */
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const characters = useMemo(() => flattenPresence(presence), [presence]);

  if (characters.length === 0) {
    if (!loaded) return null;
    return (
      <p className="xp-desktop-characters-hint">
        No live voice on the lawn — run the bot on this database, or deploy bot + web on Railway
        sharing the volume.
      </p>
    );
  }

  return (
    <div className="xp-desktop-characters" aria-hidden>
      {characters.map((character) => (
        <div
          key={character.userId}
          className={`xp-desktop-character xp-desktop-character--${character.facing}`}
          style={{
            left: `${character.leftPct}%`,
            bottom: `${character.bottomPct}%`,
            animationDelay: `${character.animDelayMs}ms`,
          }}
          title={`${character.username} · ${character.channelName}`}
        >
          <div className="xp-desktop-character-shadow" />
          {character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="xp-desktop-character-avatar"
              src={character.avatarUrl}
              alt=""
              width={48}
              height={48}
              draggable={false}
            />
          ) : (
            <div className="xp-desktop-character-fallback">
              {character.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="xp-desktop-character-name">{character.username}</span>
        </div>
      ))}
    </div>
  );
}
