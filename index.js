const { Client, IntentsBitField, SlashCommandBuilder, REST, Routes, MessageFlags, ChannelType, MessageActivityType, GatewayIntentBits } = require('discord.js');
const readline = require('readline');
const fs = require("fs")
const path = require("path");
const mongoose = require('mongoose');
require('dotenv').config();

const constStart = new Boolean(true);

const { logMessage } = require('./logsschema');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const settingsPath = path.join(__dirname, 'settings.json');
let settings = {};
if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

function saveSettings() {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
}

client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
});

const commands = [

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('clientReady', async () => {
  try {
    console.log('🚀 Clearing old guild commands...');
    const cleared = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] }
    );
    console.log(`Cleared commands: ${JSON.stringify(cleared)}`);

    console.log('🚀 Registering slash commands...');
    const registered = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log(`Registered commands: ${JSON.stringify(registered)}`);

    console.log('✅ Slash commands registered in guild!');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
  }

  const guildSettings = settings[guildId] || {};

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.on('messageCreate', (message) => {
  logMessage(message);
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
if (!constStart) {
  console.log('Type "start" to launch the bot, "stop" to terminate it, or "restart" to restart it.');
  rl.on('line', (input) => {
  if (input.trim() === 'start' || (constStart === True)) {
    if (!client.readyAt) {
      console.log('Starting the bot...');
      client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error('Login error:', err);
      });
    } else {
      console.log('Bot is already running.');
    }
  } else if (input.trim() === 'stop') {
    console.log('Stopping the bot...');
    client.destroy();
    rl.close();
  } else if (input.trim() === "restart") {
    console.log('Restarting the bot...');
    client.destroy().then(() => {
      setTimeout(() => {
        console.log('Starting the bot...');
        client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error('Login error:', err);
      });
      }, 5000);
    });
  }
});
} else {
  if (!client.readyAt) {
      console.log('Starting the bot...');
      client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error('Login error:', err);
      });
    } else {
      console.log('Bot is already running.');
    }
}



