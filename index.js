const { Client, IntentsBitField, SlashCommandBuilder, REST, Routes, MessageFlags, ChannelType, MessageActivityType } = require('discord.js');
const readline = require('readline');
const fs = require("fs")
const path = require("path");
require('dotenv').config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages
  ]
});

const logsPath = path.join(__dirname, 'logs.json');
let logs = {};
try {
  if (fs.existsSync(logsPath)) {
    logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
    console.log('Loaded existing logs from file.');
  } else {
    console.log('No existing logs.json found; starting fresh.');
  }
} catch (error) {
  console.error('Error loading logs.json:', error);
  logs = {}; // Fallback to empty object
}


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
  console.log('---');
  console.log('Message content:', message.content);
  console.log('Author tag:', message.author.tag);
  console.log('Author ID:', message.author.id);
  console.log('Guild name:', message.guild ? message.guild.name : 'DM (no guild)');
  console.log('Channel name:', message.channel.name);
  console.log('Created timestamp:', message.createdTimestamp);
  console.log('---');

  // Skip if the author is a bot
  if (message.author.bot) {
    console.log('Skipping bot message.');
    return;
  }

  // Skip if no guild (e.g., DMs)
  if (!message.guild) {
    console.log('Skipping DM message (no guild).');
    return;
  }

  try {
    // Ensure the nested structure exists (use objects)
    if (!logs[message.guild.id]) {
      logs[message.guild.id] = {};
      console.log(`Initialized logs for guild: ${message.guild.id}`);
    }
    if (!logs[message.guild.id][message.author.id]) {
      logs[message.guild.id][message.author.id] = {};
      console.log(`Initialized logs for author: ${message.author.id} in guild: ${message.guild.id}`);
    }
    
    // Add the message data
    logs[message.guild.id][message.author.id][message.id] = {
      content: message.content,
      timestamp: message.createdTimestamp,
      attachment: message.attachments.map(att => att.url),
      type: message.type,
      channelInfo: {
        channelId: message.channel.id,
        channelName: message.channel.name
      }
    };
    console.log(`Logged message ID: ${message.id} for author: ${message.author.id} in guild: ${message.guild.id}`);
    
    // Write the updated logs to file
    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 4));
    console.log('Successfully wrote to logs.json');
  } catch (error) {
    console.error('Error logging message:', error);
  }

  if (message.content === 'ping') {
    message.reply('pong');
  }
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input.trim() === 'start') {
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


