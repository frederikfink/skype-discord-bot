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
    .setName("voice-leaderboard")
    .setDescription("Show the voice activity leaderboard")
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Time period for the leaderboard")
        .setRequired(false)
        .addChoices(
          { name: "Today", value: "day" },
          { name: "This Week", value: "week" },
          { name: "This Month", value: "month" },
          { name: "Year to Date", value: "ytd" },
          { name: "All Time", value: "all" },
        ),
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

console.log(`Registered ${commands.length} guild command.`);
