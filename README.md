# JSDA

### JavaScript Discord API for Minecraft Bedrock

JSDA (JavaScript Discord API) is a Discord API library designed to run inside Minecraft Bedrock Dedicated Server using the Minecraft Script API.

JSDA allows you to connect Discord bots directly to your Minecraft scripts without needing a separate Node.js server.

> ⚠️ JSDA is currently under development.

## Features

* Discord REST API authentication
* Discord Gateway connection
* Automatic Gateway heartbeats
* Bot online status and user information
* Send Discord messages
* Create and register slash commands
* Fetch, edit, and delete application commands
* Bulk overwrite application commands
* Handle slash command interactions
* Create and handle Discord buttons
* Register commands and buttons from different scripts

## Requirements

* Minecraft Bedrock Dedicated Server
* `@minecraft/server`
* `@minecraft/server-net`
* A Discord application and bot

## Installation

Import the JSDA classes into your behavior pack scripts.

Make sure your behavior pack has access to the required Minecraft modules.

## Getting Started

### 1. Import JSDA

```js
import { Client } from "./JSDA/Client.js";
import { Commands } from "./JSDA/Commands.js";
import { Buttons } from "./JSDA/Buttons.js";
```

Adjust the paths to match your project structure.

### 2. Create the Client

```js
const client = new Client({
    token: BOT_TOKEN,
    intents: 0
});

client.commands = new Commands(APPLICATION_ID, BOT_TOKEN);
client.buttons = new Buttons(BOT_TOKEN);
```

### 3. Login

For testing inside Minecraft Bedrock, use `world.afterEvents.worldLoad.subscribe()`.

This prevents early execution issues when trying to connect to Discord or use Minecraft APIs before the world has loaded.

```js
world.afterEvents.worldLoad.subscribe(async () => {
    try {
        await client.login();

        console.warn(
            "JSDA logged in as " + client.user.username
        );

    } catch (error) {
        console.warn("JSDA Login Error: " + error);
    }
});
```

Once Discord sends the `READY` event, `client.login()` finishes and `client.online` becomes `true`.

## Client

The `Client` class manages your Discord bot connection.

### Properties

| Property          | Description                  |
| ----------------- | ---------------------------- |
| `client.token`    | Discord bot token            |
| `client.intents`  | Gateway intents              |
| `client.user`     | Logged-in Discord user       |
| `client.online`   | Gateway online status        |
| `client.socket`   | Gateway WebSocket connection |
| `client.commands` | Command manager              |
| `client.buttons`  | Button manager               |

### Methods

| Method           | Description                           |
| ---------------- | ------------------------------------- |
| `client.login()` | Authenticates and connects to Discord |

## Slash Commands

Create commands using `client.commands.create()`.

```js
client.commands.create({
    name: "ping",
    description: "Check the bot's latency",

    async execute(interaction) {
        await interaction.reply("Pong!");
    }
});
```

Register commands with Discord:

```js
await client.commands.register();
```

### Other Command Methods

| Method            | Description                     |
| ----------------- | ------------------------------- |
| `create()`        | Create a command                |
| `fetchAll()`      | Fetch registered commands       |
| `edit()`          | Edit a command                  |
| `delete()`        | Delete a command                |
| `register()`      | Register created commands       |
| `bulkOverwrite()` | Replace all registered commands |

## Buttons

JSDA supports Discord message buttons.

### Register a Button

```js
client.buttons.create({
    id: "hello",

    async execute(interaction) {
        await interaction.reply("You clicked the button!");
    }
});
```

### Send a Button

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

## Example Project

```js
import { world } from "@minecraft/server";

import { Client } from "./JSDA/Client.js";
import { Commands } from "./JSDA/Commands.js";
import { Buttons } from "./JSDA/Buttons.js";

const client = new Client({
    token: BOT_TOKEN,
    intents: 0
});

client.commands = new Commands(APPLICATION_ID, BOT_TOKEN);
client.buttons = new Buttons(BOT_TOKEN);

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

    } catch (error) {
        console.warn("JSDA Login Error: " + error);
    }
});
```

## Project Goals

JSDA aims to make Discord bot development possible directly inside Minecraft Bedrock scripts.

Its API is inspired by Discord libraries such as JDA, with a focus on making bot development familiar and straightforward for JavaScript developers.

## License

License information coming soon.

