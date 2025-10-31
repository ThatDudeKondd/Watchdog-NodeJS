const mongoose = require('mongoose');
const settingsSchema = new mongoose.Schema({
  _id: { type: String },  // Guild ID (as string)
  logChannelId: { type: String, default: null },  // Channel ID as string
  adminRoleId: { type: String, default: null }  // Administrator Role ID as string
});
const Settings = mongoose.model('settings_db', settingsSchema);
// Fixed getOrCreate: Now returns the settings document
Settings.getOrCreate = async function(guildId) {
  try {
    let settings = await Settings.findById(guildId);
    if (!settings) {
      settings = new Settings({ _id: guildId });
      await settings.save();
    }
    return settings;  // Return the document
  } catch (error) {
    console.error('Error in getOrCreate:', error);
    throw error;  // Re-throw to handle in caller
  }
};
module.exports = { Settings };
