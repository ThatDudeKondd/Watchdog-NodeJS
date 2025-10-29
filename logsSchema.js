// logger.js
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
  guildId: { type: String, required: true, unique: true },  // Unique per guild
  authors: {
    type: Map,  // Dynamic keys for author IDs
    of: {
      type: Map,  // Nested: Dynamic keys for message IDs
      of: messageDataSchema  // The message object
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
       // Prepare the message data (unchanged)
       const messageData = {
         content: message.content,
         timestamp: message.createdTimestamp,
         attachment: message.attachments.map(att => att.url),
         type: message.type,
         channelInfo: {
           channelId: message.channel.id,
           channelName: message.channel.name
         }
       };
       // Upsert the guild document with the nested data (fixed update)
       await GuildLogs.findOneAndUpdate(
         { guildId: message.guild.id },  // Find by guild ID
         {
           $set: { [`authors.${message.author.id}.${message.id}`]: messageData }  // Set the nested path
         },
         { upsert: true, new: true }  // Create if doesn't exist, return updated doc
       );
       console.log(`Logged message ID: ${message.id} for author: ${message.author.id} in guild: ${message.guild.id}`);
     } catch (error) {
       console.error('Error logging message to MongoDB:', error);
     }
   }
   module.exports = { logMessage };