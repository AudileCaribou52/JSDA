import { WebSocket, websocket, http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";
import { world, system } from "@minecraft/server";

const BOT_TOKEN = ""
const CHANNEL_ID = ""
const APPLICATION_ID = ""

class Buttons {
    constructor(token) {
        this.token = token;
        this.registered = new Map();
        this.baseUrl = "https://discord.com/api/v10";
    }

    create(button) {
        if (!button.id || !button.execute) {
            throw new Error("Button requires id and execute!");
        }

        this.registered.set(button.id, button);
        return button;
    }

    async handle(interactionData) {
        const button = this.registered.get(
            interactionData.data?.custom_id
        );

        if (!button) return;

        const interaction = {
            id: interactionData.id,
            token: interactionData.token,
            applicationId: interactionData.application_id,
            customId: interactionData.data.custom_id,
            user: interactionData.member?.user ?? interactionData.user,
            member: interactionData.member,
            channelId: interactionData.channel_id,
            guildId: interactionData.guild_id,

            async reply(data) {
                const request = new HttpRequest(
                    `https://discord.com/api/v10/interactions/${interactionData.id}/${interactionData.token}/callback`
                );

                request.method = HttpRequestMethod.Post;
                request.headers = [
                    new HttpHeader("Authorization", "Bot " + this.token),
                    new HttpHeader("Content-Type", "application/json")
                ];

                request.body = JSON.stringify({
                    type: 4,
                    data: typeof data === "string"
                        ? { content: data }
                        : data
                });

                const response = await http.request(request);

                if (response.status < 200 || response.status >= 300) {
                    throw new Error(
                        "Discord API Error: " + response.status + " - " + response.body
                    );
                }

                return response;
            }
        };

        interaction.reply = interaction.reply.bind(this);

        await button.execute(interaction);
    }
}

class Commands {
    constructor(applicationId, token, guildId = null) {
        this.applicationId = applicationId;
        this.token = token;
        this.guildId = guildId;
        this.registered = new Map();

        this.baseUrl = "https://discord.com/api/v10";
    }

    get endpoint() {
        return this.guildId
            ? `/applications/${this.applicationId}/guilds/${this.guildId}/commands`
            : `/applications/${this.applicationId}/commands`;
    }

    async request(method, endpoint, body = null) {
        const request = new HttpRequest(this.baseUrl + endpoint);

        request.method = method;
        request.headers = [
            new HttpHeader("Authorization", "Bot " + this.token),
            new HttpHeader("Content-Type", "application/json")
        ];

        if (body !== null) {
            request.body = JSON.stringify(body);
        }

        const response = await http.request(request);

        if (response.status < 200 || response.status >= 300) {
            throw new Error(
                `Discord API Error: ${response.status} - ${response.body}`
            );
        }

        return response.body ? JSON.parse(response.body) : null;
    }

    create(command) {
        if (!command.name || !command.description || !command.execute) {
            throw new Error("Command requires name, description and execute!");
        }

        this.registered.set(command.name, command);

        return command;
    }

    async register() {
        const commands = [...this.registered.values()].map(command => {
            const { execute, ...data } = command;
            return data;
        });

        return await this.request(
            HttpRequestMethod.Put,
            this.endpoint,
            commands
        );
    }

    async bulkOverwrite(commands) {
        return await this.request(
            HttpRequestMethod.Put,
            this.endpoint,
            commands
        );
    }

    async handle(interactionData) {
        const command = this.registered.get(interactionData.data?.name);

        if (!command) return;

        const interaction = {
            id: interactionData.id,
            token: interactionData.token,
            applicationId: interactionData.application_id,
            user: interactionData.member?.user ?? interactionData.user,
            member: interactionData.member,
            channelId: interactionData.channel_id,
            guildId: interactionData.guild_id,
            data: interactionData.data,

           reply: async (data) => {
                return await this.request(
                    HttpRequestMethod.Post,
                    `/interactions/${interactionData.id}/${interactionData.token}/callback`,
                    {
                        type: 4,
                        data: typeof data === "string"
                            ? { content: data }
                            : data
                    }
                );
            }
        };

        await command.execute(interaction);
    }
}

class TextChannel {
    constructor(id, token) {
        this.id = id;
        this.token = token;
    }

    async send(content) {
        const request = new HttpRequest(
            `https://discord.com/api/v10/channels/${this.id}/messages`
        );

        request.method = HttpRequestMethod.Post;
        request.headers = [
            new HttpHeader("Authorization", "Bot " + this.token),
            new HttpHeader("Content-Type", "application/json")
        ];

        request.body = JSON.stringify({ content });

        const response = await http.request(request);

        if (response.status !== 200 && response.status !== 201) {
            throw new Error("Discord API error: " + response.status);
        }

        return JSON.parse(response.body);
    }
}


export class Client {
    constructor(options) {
        this.token = options.token;
        this.user = null;
    }

    async login() {
        const request = new HttpRequest(
            "https://discord.com/api/v10/users/@me"
        );

        request.method = HttpRequestMethod.Get;

        request.headers = [
            new HttpHeader("Authorization", "Bot " + this.token),
            new HttpHeader("Content-Type", "application/json")
        ];

        const response = await http.request(request);

        if (response.status !== 200) {
            throw new Error(
                "Discord authentication failed: " + response.status
            );
        }

        this.user = JSON.parse(response.body);

        return this.user;
    }
}

const client = new Client({
    token: BOT_TOKEN
});
client.commands = new Commands(
    APPLICATION_ID,
    BOT_TOKEN
);

client.buttons = new Buttons(BOT_TOKEN);

world.afterEvents.worldLoad.subscribe(async () => {
    try {
        await client.login();

        console.warn("JSDA logged in as " + client.user.username);

    } catch (error) {
        console.warn("JSDA Login Error: " + error);
    }
    const socket = await websocket.connect(
        "wss://gateway.discord.gg/?v=10&encoding=json"
    );

    let sequence = null;
    let heartbeatStarted = false;

    socket.afterEvents.message.subscribe((event) => {
        const packet = JSON.parse(event.message);

        if (packet.s !== null) {
            sequence = packet.s;
        }

        // Discord HELLO
        if (packet.op === 10 && !heartbeatStarted) {
            heartbeatStarted = true;

            const interval = packet.d.heartbeat_interval;
            const ticks = Math.floor(interval / 50);

            // Start heartbeat with randomized initial delay
            system.runTimeout(() => {
                socket.send(JSON.stringify({
                    op: 1,
                    d: sequence
                }));

                system.runInterval(() => {
                    if (!socket.isOpen) return;

                    socket.send(JSON.stringify({
                        op: 1,
                        d: sequence
                    }));
                }, ticks);
            }, Math.floor(Math.random() * ticks));

            // IDENTIFY
            socket.send(JSON.stringify({
                op: 2,
                d: {
                    token: BOT_TOKEN,
                    intents: 0,
                    properties: {
                        os: "linux",
                        browser: "JSDA",
                        device: "JSDA"
                    }
                }
            }));

            console.warn("[JSDA] IDENTIFY sent!");
        }

        // Discord READY
        if (packet.t === "READY") {
            console.warn("[JSDA] Bot is ONLINE!");
            console.warn("[JSDA] Logged in as " + packet.d.user.username);
        }

        if (packet.op === 11) {
            console.warn("[JSDA] Heartbeat acknowledged!");
        }
        if (packet.t === "INTERACTION_CREATE") {
            const data = packet.d;

            console.warn("[JSDA] Interaction type: " + data.type);

            if (data.type === 2) {
                client.commands.handle(data);
            }

            if (data.type === 3) {
                console.warn("[JSDA] Button clicked: " + data.data.custom_id);
                client.buttons.handle(data);
            }
        }
    });
    // await commands.create({
    //     name: "ping",
    //     description: "Check bot latency",
    //     type: 1
    // });
    // await commands.bulkOverwrite([]);
    client.commands.create({
        name: "ping",
        description: "Check bot latency",

        async execute(interaction) {
            await interaction.reply("Pong!");
        }
    });
    client.commands.create({
        name: "button",
        description: "Send a button",

        async execute(interaction) {
            client.buttons.create({
                id: "hello",

                async execute(buttonInteraction) {
                    await buttonInteraction.reply("You clicked the button!");
                }
            });

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
        }
    });
    await client.commands.register();
});