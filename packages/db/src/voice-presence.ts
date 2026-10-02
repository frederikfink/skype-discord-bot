export type VoicePresenceMember = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export type VoicePresenceRoom = {
  channelId: string;
  channelName: string;
  members: VoicePresenceMember[];
};

export type VoicePresencePayload = {
  rooms: VoicePresenceRoom[];
  updatedAt: number;
};

export function emptyVoicePresence(): VoicePresencePayload {
  return {
    rooms: [],
    updatedAt: Date.now(),
  };
}
