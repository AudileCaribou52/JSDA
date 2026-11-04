# JSDA

### JavaScript Discord API for Minecraft Bedrock

JSDA is a JavaScript Discord API library designed to run inside **Minecraft Bedrock Dedicated Server (BDS)** using the Script API and `@minecraft/server-net`.

It allows Bedrock scripts to connect to Discord, interact with the Gateway, manage application commands, and respond to interactions.

> ⚠️ JSDA is currently under development.

## Features

* Discord Gateway connection
* Bot identification and authentication
* Automatic Gateway heartbeats
* Send messages through Discord's REST API
* Create and register slash commands
* Fetch, edit, and delete application commands
* Bulk overwrite application commands
* Handle slash command interactions
* Create and handle Discord buttons
* Register commands and callbacks from different scripts

## Requirements

* Minecraft Bedrock Dedicated Server
* `@minecraft/server`
* `@minecraft/server-net`
* A Discord application and bot

## Getting Started

Initialize your JSDA client and its command and button managers:

```js
client.commands = new Commands(APPLICATION_ID, BOT_TOKEN);
client.buttons = new Buttons(BOT_TOKEN);
```

Connect to the Discord Gateway and register your commands after creating them.

## Slash Commands

Create a slash command using `client.commands.create()`:

```js
client.commands.create({
    name: "ping",
    description: "Check the bot's latency",

    async execute(interaction) {
        await interaction.reply("Pong!");
    }
});
```

Register your commands with Discord:

```js
await client.commands.register();
```

## Buttons

Register a button callback:

```js
client.buttons.create({
    id: "hello",

    async execute(interaction) {
        await interaction.reply("You clicked the button!");
    }
});
```

Send a message containing a button:

```js
await interaction.reply({
    content: "Click the button below!",
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
```

## Project Goals

JSDA aims to make Discord bot development possible directly inside Minecraft Bedrock scripts, with an API that feels familiar to developers who have used libraries like JDA.

## License

License information coming soon.
