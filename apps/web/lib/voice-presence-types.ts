/** Client-safe mirror of @repo/db/voice-presence types */
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
