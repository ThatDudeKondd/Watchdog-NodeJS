// logs.js
const mongoose = require('mongoose');

// Sub-schema for sent messages
const messageSentDataSchema = new mongoose.Schema({
  content: { type: String, default: "" },
  timestamp: { type: Number, required: true },
  attachment: { type: [String], default: [] },
  type: { type: Number, default: 0 },
  channelInfo: {
    channelId: { type: String, required: true },
    channelName: { type: String, default: "" }
  }
}, { _id: false });

// Sub-schema for edited messages
const messageEditedDataSchema = new mongoose.Schema({
  content: { type: String, default: "" },  // Current content (after edit)
  oldContent: { type: String, default: "" },
  newContent: { type: String, default: "" },
  timestamp: { type: Number, required: true },
  oldAttachment: { type: [String], default: [] },
  newAttachment: { type: [String], default: [] },
  type: { type: Number, default: 0 },
  channelInfo: {
    channelId: { type: String, required: true },
    channelName: { type: String, default: "" }
  }
}, { _id: false });

// Sub-schema for deleted messages
const messageDeleteDataSchema = new mongoose.Schema({
  content: { type: String, default: "" },
  timestamp: { type: Number, required: true },
  deletedTimestamp: { type: Number, required: false },
  attachment: { type: [String], default: [] },
  type: { type: Number, default: 0 },
  channelInfo: {
    channelId: { type: String, required: true },
    channelName: { type: String, default: "" }
  }
}, { _id: false });

// Schema for a guild's logs (using a flexible Map to store different message types)
const guildLogsSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // Guild ID as string
  authors: {
    type: Map,
    of: {
      type: Map,
      of: mongoose.Schema.Types.Mixed  // Flexible to store sent, edited, or deleted data
    }
  }
});

// Model for the collection (one document per guild)
const GuildLogs = mongoose.model('logs_db', guildLogsSchema);

// Function to log a message
async function logMessage(actionType, message, editedMessage = null) {
  try {
    // Skip bots and DMs
    if (message.author.bot || !message.guild) {
      console.log('Skipping message (bot or DM).');
      return;
    }

    let messageData;

    if (actionType === 'sent') {
      messageData = {
        content: message.content || '',
        timestamp: message.createdTimestamp,
        attachment: message.attachments ? message.attachments.map(att => att.url) : [],
        type: message.type || 0,
        channelInfo: {
          channelId: message.channel.id,
          channelName: message.channel.name || ''
        }
      };
    } else if (actionType === 'edit') {
      if (!editedMessage) {
        console.error('Edited message requires oldMessage, but it was not provided.');
        return;
      }
      messageData = {
        content: message.content || '',
        oldContent: editedMessage.content || '',
        newContent: message.content || '',
        sentTimestamp: message.createdTimestamp,
        editTimestamp: message.editedTimestamp || Date.now(),
        oldAttachment: editedMessage.attachments ? editedMessage.attachments.map(att => att.url) : [],
        newAttachment: message.attachments ? message.attachments.map(att => att.url) : [],
        type: message.type || 0,
        channelInfo: {
          channelId: message.channel.id,
          channelName: message.channel.name || ''
        }
      };
    } else if (actionType === 'delete') {
      messageData = {
        content: message.content || '',
        timestamp: message.createdTimestamp,
        deletedTimestamp: Date.now(),
        attachment: message.attachments ? message.attachments.map(att => att.url) : [],
        type: message.type || 0,
        channelInfo: {
          channelId: message.channel.id,
          channelName: message.channel.name || ''
        }
      };
    } else {
      console.error(`Unknown actionType: ${actionType}`);
      return;
    }

    const authorKey = `${message.author.username}/${message.author.id}`;
    const fullPath = `authors.${authorKey}.${actionType}/${message.id}`;

    const result = await GuildLogs.findOneAndUpdate(
      { _id: message.guild.id },
      { $set: { [fullPath]: messageData } },
      { upsert: true, new: true }
    );
    
  } catch (error) {
    console.error('Error logging message to MongoDB:', error);
  }
}

module.exports = { logMessage };