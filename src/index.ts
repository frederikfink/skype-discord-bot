import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { handleVoiceLeaderboardCommand } from "./commands/leaderboard.js";
import { StatsDatabase } from "./db/index.js";
import { VoiceTracker } from "./trackers/voice.js";

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const databasePath = process.env.DATABASE_PATH ?? "./data/bot.db";

if (!token || !guildId) {
  throw new Error("DISCORD_TOKEN and DISCORD_GUILD_ID are required");
}

const db = new StatsDatabase(databasePath);
const voiceTracker = new VoiceTracker(db);

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

  console.log(`Seeded active voice sessions for guild ${guild.name}`);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  if (oldState.guild.id !== guildId && newState.guild.id !== guildId) return;
  voiceTracker.handleUpdate(oldState, newState);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "voice-leaderboard") {
    await handleVoiceLeaderboardCommand(interaction, db);
  }
});

function shutdown(): void {
  console.log("Shutting down, flushing active sessions...");
  voiceTracker.flushAll();
  db.close();
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await client.login(token);
