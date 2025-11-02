const { EmbedBuilder, ChannelType } = require('discord.js');
const { Settings } = require('../../schemas/settings');

const setupEmbedMain = async function(sentChannel) {
    const embed = new EmbedBuilder()
        .setAuthor({
            name: "Setup Wizard",
            iconURL: "https://cdn.discordapp.com/attachments/1334208133387522089/1433923008975863819/Watchdog_PNG.png?ex=69086e9e&is=69071d1e&hm=1bdaff822ad6ed1462a98ad151e52d2982eac166545ce0f80e8153e70497d0b1&",
    })
    .setTitle("Setup Wizard")
    .setDescription("Welcome to the setup process! This will help you configure the bot for your server.\nFollow the steps carefully to ensure everything runs smoothly.")
    .addFields(
        {
            name: "Step 1",
            value: "Choose the main channel for bot announcements and messages.",
            inline: false
        },
        {
            name: "Step 2",
            value: "Select a log channel for moderation and system logs.",
            inline: false
        },
        {
            name: "Step 3",
            value: "Configure roles required to use admin/moderation commands.",
            inline: false
        },
        )
    .setColor("#00ffff")
    .setFooter({
        text: "Use the buttons to continue.",
    })
    .setTimestamp();

 await sentChannel.send({ embeds: [embed] });
};