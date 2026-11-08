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

client.commands.create({
    name: "hello",
    description: "Say hello",
    options: [
        {
            type: 3,
            name: "message",
            description: "Message to say",
            required: true
        },
        {
            type: 6,
            name: "user",
            description: "User to greet",
            required: false
        },
        {
            type: 5,
            name: "excited",
            description: "Make it exciting",
            required: false
        }
    ],
    async execute(interaction) {
        const options = interaction.data.options;

        const message = options.find(o => o.name === "message")?.value;
        const user = options.find(o => o.name === "user")?.value;
        const excited = options.find(o => o.name === "excited")?.value;

        await interaction.reply(
            `${message}${user ? ` <@${user}>` : ""}${excited ? "!!!" : ""}`
        );
    }
});

// Wait for world load before logging in
world.afterEvents.worldLoad.subscribe(async () => {
    try {
        await client.login();

        console.warn("JSDA logged in as " + client.user.username);

        const result = await client.commands.register();
        console.warn(JSON.stringify(result, null, 2));

        await channel.send("JSDA is online!");

    } catch (error) {
        console.warn("JSDA Login Error: " + error);
    }
});