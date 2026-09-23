import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error("DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID are required");
}

const commands = [
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the online time leaderboard"),
  new SlashCommandBuilder()
    .setName("voice-leaderboard")
    .setDescription("Show the voice activity leaderboard"),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

console.log(`Registered ${commands.length} guild commands.`);
