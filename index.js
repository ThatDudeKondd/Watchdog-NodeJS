// Variables and imports

const { Client, IntentsBitField, SlashCommandBuilder, REST, Routes, MessageFlags, ChannelType, EmbedBuilder, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const readline = require('readline');
const constStart = new Boolean(true);
const mongoose = require('mongoose');
require('dotenv').config();

const { messageSendEmbed, messageEditEmbed, messageDeleteEmbed } = require('./embeds/logs/message.js');

// Bot startup below

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const guildIds = process.env.GUILD_IDS ? process.env.GUILD_IDS.split(',') : [];

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  try {
    for (const guildId of guildIds) {
      console.log(`🚀 Clearing old guild commands for ${guildId}...`);
      const cleared = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: [] }
      );
      console.log(`Cleared commands for ${guildId}: ${JSON.stringify(cleared)}`);
      console.log(`🚀 Registering slash commands for ${guildId}...`);
      const registered = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`Registered commands for ${guildId}: ${JSON.stringify(registered)}`);
    }
    console.log('✅ Slash commands registered in all specified guilds!');
  } catch (error) {
    console.error('❌ Failed to register slash commands:', error);
  }
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

// MongoDB and Schema setup

const connection = mongoose.connect(process.env.MONGO_URI, {})
    .then(conn => {
        console.log('Connected to MAIN_DB MongoDB');
        return conn})
    .catch(err => {
        console.error('Error connecting to MAIN_DB MongoDB:', err);
    });

const { logMessage } = require('./schemas/logs');
const { Settings } = require('./schemas/settings');

// Command registration

const commands = [
  new SlashCommandBuilder()
    .setName('set')
    .setDescription('Sets settings (temporary untill we move to a dashboard setup)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('logchannel')
        .setDescription('Sets the log channel for the server')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to set as the log channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('administrator')
        .setDescription('Sets the administrator role for the server')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to set as the administrator role')
            .setRequired(true)))
].map(command => command.toJSON());

// Command Handling

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: 'This bot can only be used in a server.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'set') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      if (!channel) {
        return interaction.reply({ content: 'Channel not found.', flags: MessageFlags.Ephemeral });
      }

      try {

        const settings = await Settings.getOrCreate(guildId);

        settings.logChannelId = channel.id;
        await settings.save();
        
        return interaction.reply({ content: `Log channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error('Error saving settings:', error);
        return interaction.reply({ content: 'Failed to save settings. Please try again.', flags: MessageFlags.Ephemeral });
      }
    }
    if (subcommand === 'administrator') {
      const role = interaction.options.getRole('role');
      if (!role) {
        return interaction.reply({ content: 'Role was not found.', flags: MessageFlags.Ephemeral });
      }

      try {

        const settings = await Settings.getOrCreate(guildId);

        settings.adminRoleId = role.id;
        await settings.save();
        
        return interaction.reply({ content: `Administrator role saved to ${role}.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error('Error saving settings:', error);
        return interaction.reply({ content: 'Failed to save settings. Please try again.', flags: MessageFlags.Ephemeral });
      }
    } 
}});

// Listeners for evenets

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  logMessage('sent', message);
  messageSendEmbed(message);
});
client.on('messageUpdate', (oldMessage, newMessage) => {
  if (newMessage.author.bot) return;
  logMessage('edit', newMessage, oldMessage);
  messageEditEmbed(oldMessage, newMessage);
});
client.on('messageDelete', (message) => {
  if (message.author.bot) return;
  logMessage('delete', message);
  messageDeleteEmbed(message);
});