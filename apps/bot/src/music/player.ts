import type { StatsDatabase } from "@repo/db";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import play from "play-dl";
import { syncRadioState } from "./radio-sync.js";
import type { QueueTrack } from "./types.js";

export class GuildMusicPlayer {
  private queue: QueueTrack[] = [];
  private current: QueueTrack | null = null;
  private connection: VoiceConnection | null = null;
  private readonly player: AudioPlayer;
  private startedAt: number | null = null;
  private playing = false;

  constructor(private readonly db: StatsDatabase) {
    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Idle, () => {
      void this.onIdle();
    });
    this.player.on("error", (error) => {
      console.error("Audio player error:", error);
      this.player.stop(true);
    });
  }

  getCurrent(): QueueTrack | null {
    return this.current;
  }

  getQueue(): QueueTrack[] {
    return [...this.queue];
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async enqueue(tracks: QueueTrack[], channel: VoiceBasedChannel): Promise<void> {
    await this.ensureConnection(channel);
    this.queue.push(...tracks);
    this.publishRadio();

    if (!this.current && this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    }
  }

  skip(): boolean {
    if (!this.current && this.queue.length === 0) {
      return false;
    }
    this.player.stop(true);
    return true;
  }

  stop(): void {
    this.queue = [];
    this.current = null;
    this.startedAt = null;
    this.playing = false;
    this.player.stop(true);
    this.disconnect();
    this.publishRadio();
  }

  private async ensureConnection(channel: VoiceBasedChannel): Promise<void> {
    if (this.connection) {
      if (this.connection.joinConfig.channelId !== channel.id) {
        this.connection.destroy();
        this.connection = null;
      } else {
        return;
      }
    }

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    this.connection.on("error", (error) => {
      console.error("Voice connection error:", error);
    });

    this.connection.subscribe(this.player);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
    } catch (error) {
      this.connection.destroy();
      this.connection = null;
      throw new Error("Could not join the voice channel.", { cause: error });
    }
  }

  private async onIdle(): Promise<void> {
    this.current = null;
    this.startedAt = null;
    this.playing = false;
    await this.playNext();
  }

  private async playNext(): Promise<void> {
    const next = this.queue.shift() ?? null;
    if (!next) {
      this.publishRadio();
      this.disconnect();
      return;
    }

    try {
      const streamed = await play.stream(next.url);
      const resource = createAudioResource(streamed.stream, {
        inputType: streamed.type,
      });
      this.current = next;
      this.startedAt = Date.now();
      this.playing = true;
      this.publishRadio();
      this.player.play(resource);
    } catch (error) {
      console.error(`Failed to stream ${next.url}:`, error);
      this.current = null;
      this.startedAt = null;
      this.playing = false;
      await this.playNext();
    }
  }

  private disconnect(): void {
    if (!this.connection) return;
    this.connection.destroy();
    this.connection = null;
  }

  private publishRadio(): void {
    syncRadioState(this.db, {
      current: this.current,
      queue: this.queue,
      isPlaying: this.playing,
      startedAt: this.startedAt,
    });
  }
}

export class MusicManager {
  private readonly players = new Map<string, GuildMusicPlayer>();

  constructor(private readonly db: StatsDatabase) {}

  get(guildId: string): GuildMusicPlayer {
    let player = this.players.get(guildId);
    if (!player) {
      player = new GuildMusicPlayer(this.db);
      this.players.set(guildId, player);
    }
    return player;
  }
}
