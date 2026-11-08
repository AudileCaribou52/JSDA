import { world } from "@minecraft/server";

import { Client, Commands, Buttons, TextChannel } from "./JSDA/main.js";

const BOT_TOKEN = ""
const APPLICATION_ID = ""
const CHANNEL_ID = ""

const client = new Client({
    token: BOT_TOKEN,
    intents: 0
});

client.commands = new Commands(APPLICATION_ID, BOT_TOKEN);
client.buttons = new Buttons(BOT_TOKEN);

const channel = new TextChannel(CHANNEL_ID, BOT_TOKEN);

// Register button callback
client.buttons.create({
    id: "hello",

    async execute(interaction) {
        await interaction.reply("Hello from JSDA!");
    }
});

// Register slash command
client.commands.create({
    name: "hello",
    description: "Say hello",

    async execute(interaction) {
        await interaction.reply({
            content: "Hello!",
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 1,
                            label: "Click Me!",
                            custom_id: "hello"
                        }
                    ]
                }
            ]
        });
    }
});

// Wait for world load before logging in
world.afterEvents.worldLoad.subscribe(async () => {
    try {
        await client.login();

        console.warn("JSDA logged in as " + client.user.username);

        await client.commands.register();

        await channel.send("JSDA is online!");

    } catch (error) {
        console.warn("JSDA Login Error: " + error);
    }
});
