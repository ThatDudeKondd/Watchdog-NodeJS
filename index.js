
// Variables and imports

const { Client, IntentsBitField, SlashCommandBuilder, REST, Routes, MessageFlags, ChannelType, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const readline = require('readline');
const constStart = new Boolean(true);
const mongoose = require('mongoose');
require('dotenv').config();

// Bot startup below

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const guildIds = process.env.GUILD_IDS ? process.env.GUILD_IDS.split(',') : [];

client.once('clientReady', async () => {  // Fixed: 'ready' instead of 'clientReady'
  console.log(`Logged in as ${client.user.tag}!`);
  try {
    // Register commands for each guild
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

const { logMessage } = require('./logsschema');
const { Settings } = require('./settingsSchema');

// Command registration

const commands = [
  new SlashCommandBuilder()
    .setName('set')
    .setDescription('Sets settings (temporary untill we move to a dashboard setup)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('logchannel')
        .setDescription('Sets the log channel for the server')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to set as the log channel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))

].map(command => command.toJSON());

// Command Handling and other event listeners

client.on('messageCreate', (message) => {
  if (message.author.bot) return; // Ignore bot messages
  logMessage(message);
  messageSendEmbed(message);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'set') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      if (!channel) {
        return interaction.reply({ content: 'Channel not found.', flags: MessageFlags.Ephemeral });
      }

      try {
        // Get or create settings for the guild
        const settings = await Settings.getOrCreate(guildId);

        // Update the log channel ID
        settings.logChannelId = channel.id;
        await settings.save();  // Save to database
        
        return interaction.reply({ content: `Log channel set to ${channel}.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error('Error saving settings:', error);
        return interaction.reply({ content: 'Failed to save settings. Please try again.', flags: MessageFlags.Ephemeral });
      }
    }
  }
});

// Embeds

const messageSendEmbed = async function(message) {
  const serverId = message.guild.id;

  try {
    const settings = await Settings.getOrCreate(serverId);
    const logChannelId = settings.logChannelId;

    if (!logChannelId) {
      console.log('No log channel set for this guild. Skipping embed.');
      return;
    }

    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) {
      console.error('Invalid log channel for guild:', serverId);
      return;
    }

    const messageSentEmbed = new EmbedBuilder()
      .setAuthor({ name: "Message Sent" })
      .setDescription(`> Channel: ${message.channel} \n> Message Author: ${message.author} \n> Message ID: ${message.id} \n> Timestamp: <t:${Math.floor(message.createdTimestamp / 1000)}:F>`)
      .addFields({
        name: "Message Content:",
        value: message.content || "No content",
        inline: false
      })
      .setColor("#00ff00")
      .setFooter({ text: "By Watchdog Security" })  // Fixed typo
      .setTimestamp();

    // Send to log channel
    await logChannel.send({ embeds: [messageSentEmbed] });
  } catch (error) {
    console.error('Error in messageSendEmbed:', error);
  }
};

// Temporary fix for DB index and data cleanup (run once, then delete this block)
const fixDB = async () => {
  try {
    // Drop the old unique index on guildId
    await mongoose.connection.db.collection('logs_dbs').dropIndex({ guildId: 1 });
    console.log('✅ Dropped old guildId index.');
    // Delete documents with guildId: null
    const deleteResult = await mongoose.connection.db.collection('logs_dbs').deleteMany({ guildId: null });
    console.log(`✅ Cleaned up ${deleteResult.deletedCount} documents with null guildId.`);
    
    console.log('✅ DB fix complete. You can remove this code block now.');
  } catch (error) {
    console.log('❌ DB fix failed (index or data may not exist):', error.message);
  }
};

// Call the fix function (only once)
//fixDB();
