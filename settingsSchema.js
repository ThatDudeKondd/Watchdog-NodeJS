const mongoose = require('mongoose');

// Define the schema (same as before)
const settingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  prefix: {
    type: String,
    default: '!',
    minlength: 1,
    maxlength: 5,
    validate: {
      validator: (v) => /^[^\s]+$/.test(v),
      message: 'Prefix cannot contain spaces.'
    }
  },
  logChannel: {
    type: String,
    validate: {
      validator: (v) => /^\d+$/.test(v),
      message: 'Log channel must be a valid Discord ID.'
    }
  },
  autoModeration: {
    type: Boolean,
    default: false
  },
  spamThreshold: {
    type: Number,
    default: 5,
    min: 1,
    max: 100
  },
  bannedWords: {
    type: [String],
    default: []
  },
  muteRole: {
    type: String,
    validate: {
      validator: (v) => /^\d+$/.test(v),
      message: 'Mute role must be a valid Discord ID.'
    }
  },
  welcomeChannel: {
    type: String,
    validate: {
      validator: (v) => /^\d+$/.test(v),
      message: 'Welcome channel must be a valid Discord ID.'
    }
  },
  adminRoles: {
    type: [String],
    default: []
  },
  logLevel: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    default: 'info'
  }
}, {
  timestamps: true
});

// Static method remains the same
settingsSchema.statics.getOrCreate = async function(guildId) {
  let settings = await this.findOne({ guildId });
  if (!settings) {
    settings = new this({ guildId });
    await settings.save();
  }
  return settings;
};

// Export a function that takes the connection and returns the model
module.exports = (connection) => connection.model('Settings', settingsSchema);