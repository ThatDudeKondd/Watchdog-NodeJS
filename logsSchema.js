     // logsschema.js
     const mongoose = require('mongoose');

     // Sub-schema for the message data (matches your object structure)
     const messageDataSchema = new mongoose.Schema({
       content: { type: String, default: "" },
       timestamp: { type: Number, required: true },
       attachment: { type: [String], default: [] },  // Note: Changed to 'attachment' to match your code
       type: { type: Number, default: 0 },
       channelInfo: {
         channelId: { type: String, required: true },
         channelName: { type: String, default: "" }
       }
     }, { _id: false });

     // Schema for a guild's logs (nested structure)
     const guildLogsSchema = new mongoose.Schema({
      _id: { type: String, required: true },  // Guild ID as string
      authors: {
        type: Map,
        of: {
          type: Map,
          of: messageDataSchema
        }
      }
});

 // Model for the collection (one document per guild)
const GuildLogs = mongoose.model('logs_db', guildLogsSchema);

// Function to log a message (mirrors your original logic)
async function logMessage(message) {
  try {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) {
      console.log('Skipping message (bot or DM).');
      return;
    }
    // Prepare the message data
    const messageData = {
      content: message.content || '',
      timestamp: message.createdTimestamp,
      attachment: message.attachments.map(att => att.url) || [],
      type: message.type || 0,
      channelInfo: {
        channelId: message.channel.id,
        channelName: message.channel.name || ''
      }
    };
    // Build dynamic keys
    const authorKey = `${message.author.username}/${message.author.id}`;
    const fullPath = `authors.${authorKey}.${message.id}`;
    // Upsert the guild document
    const result = await GuildLogs.findOneAndUpdate(
      { _id: message.guild.id },
      { $set: { [fullPath]: messageData } },
      { upsert: true, new: true }
    );
    console.log(`Logged message ID: ${message.id} for author: ${message.author.id} in guild: ${message.guild.id}`);
  } catch (error) {
    console.error('Error logging message to MongoDB:', error);
    // Optionally, retry or alert
  }
}

module.exports = { logMessage };