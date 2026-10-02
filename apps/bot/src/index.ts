import { emptyVoicePresence, StatsDatabase } from "@repo/db";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { handleVoiceLeaderboardCommand } from "./commands/leaderboard.js";
import {
  handleNowPlayingCommand,
  handlePlayCommand,
  handleQueueCommand,
  handleSkipCommand,
  handleStopCommand,
} from "./commands/music.js";
import { resolveDatabasePath } from "./loadEnv.js";
import { setupPlayDl } from "./music/play-dl-setup.js";
import { MusicManager } from "./music/player.js";
import { syncVoicePresence } from "./sync/voice-presence.js";
import { VoiceTracker } from "./trackers/voice.js";

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const databasePath = resolveDatabasePath();

if (!token || !guildId) {
  throw new Error("DISCORD_TOKEN and DISCORD_GUILD_ID are required");
}

const db = new StatsDatabase(databasePath);
const voiceTracker = new VoiceTracker(db);
const musicManager = new MusicManager(db);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch();

  voiceTracker.seedActiveMembers(members.values());
  syncVoicePresence(db, guild);

  const inVoice = db.getVoicePresence().rooms.reduce((n, room) => n + room.members.length, 0);
  console.log(`Seeded active voice sessions for guild ${guild.name} (${inVoice} in voice)`);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  if (oldState.guild.id !== guildId && newState.guild.id !== guildId) return;
  voiceTracker.handleUpdate(oldState, newState);
  const guild = newState.guild.id === guildId ? newState.guild : oldState.guild;
  syncVoicePresence(db, guild);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "voice-leaderboard") {
    await handleVoiceLeaderboardCommand(interaction, db);
    return;
  }

  if (interaction.commandName === "play") {
    await handlePlayCommand(interaction, musicManager);
    return;
  }
  if (interaction.commandName === "skip") {
    await handleSkipCommand(interaction, musicManager);
    return;
  }
  if (interaction.commandName === "stop") {
    await handleStopCommand(interaction, musicManager);
    return;
  }
  if (interaction.commandName === "queue") {
    await handleQueueCommand(interaction, musicManager);
    return;
  }
  if (interaction.commandName === "nowplaying") {
    await handleNowPlayingCommand(interaction, musicManager);
    return;
  }
});

function shutdown(): void {
  console.log("Shutting down, flushing active sessions...");
  voiceTracker.flushAll();
  db.setVoicePresence(emptyVoicePresence());
  db.close();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await setupPlayDl();
await client.login(token);
