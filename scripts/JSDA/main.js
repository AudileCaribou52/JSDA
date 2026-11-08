import { WebSocket, websocket, http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";
import { world, system } from "@minecraft/server";

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
        if (
            !command ||
            typeof command !== "object" ||
            typeof command.name !== "string" ||
            !command.name ||
            typeof command.description !== "string" ||
            !command.description
        ) {
            throw new Error("Command requires name and description!");
        }

        if (typeof command.execute !== "function") {
            throw new Error("Command requires execute!");
        }

        if (command.options !== undefined) {
            if (!Array.isArray(command.options)) {
                throw new Error("Command options must be an array!");
            }

            const validArgumentTypes = [3, 4, 5, 6, 7, 8, 9, 10, 11];

            const isValid = command.options.every(option => {
                if (
                    !option ||
                    typeof option.name !== "string" ||
                    !option.name ||
                    typeof option.description !== "string" ||
                    !option.description
                ) return false;

                // Regular arguments
                if (validArgumentTypes.includes(option.type)) {
                    return true;
                }

                // Subcommands
                if (option.type === 1) {
                    return typeof option.execute === "function";
                }

                // Subcommand groups
                if (option.type === 2) {
                    return Array.isArray(option.options) &&
                        option.options.length > 0 &&
                        option.options.every(sub =>
                            sub &&
                            sub.type === 1 &&
                            typeof sub.name === "string" &&
                            typeof sub.description === "string" &&
                            typeof sub.execute === "function"
                        );
                }

                return false;
            });

            if (!isValid) {
                throw new Error("Invalid command options!");
            }

            // Don't allow mixing arguments and subcommands
            const hasArguments = command.options.some(option =>
                validArgumentTypes.includes(option.type)
            );

            const hasSubcommands = command.options.some(option =>
                option.type === 1 || option.type === 2
            );

            if (hasArguments && hasSubcommands) {
                throw new Error("Cannot mix arguments and subcommands!");
            }
        }

        this.registered.set(command.name, command);
        return command;
    }

    async register() {
        const commands = [...this.registered.values()].map(command => {
            const { execute, ...data } = command;

            if (Array.isArray(data.options)) {
                data.options = data.options.map(option => {
                    const { execute, ...optionData } = option;

                    if (Array.isArray(optionData.options)) {
                        optionData.options = optionData.options.map(sub => {
                            const { execute, ...subData } = sub;
                            return subData;
                        });
                    }

                    return optionData;
                });
            }

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

        const selected = interactionData.data.options?.[0];

        if (!selected) {
            if (typeof command.execute === "function") {
                await command.execute(interaction);
            }
            return;
        }

        if (selected.type === 1) {
            const subcommand = command.options.find(
                option => option.type === 1 && option.name === selected.name
            );

            if (subcommand) {
                await subcommand.execute(interaction);
            }
        }

        if (selected.type === 2) {
            const group = command.options.find(
                option => option.type === 2 && option.name === selected.name
            );

            if (!group) return;

            const selectedSub = selected.options?.[0];

            const subcommand = group.options.find(
                option => option.name === selectedSub?.name
            );

            if (subcommand) {
                await subcommand.execute(interaction);
            }
        }
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


class Client {
    constructor(options) {
        this.token = options.token;
        this.intents = options.intents ?? 0;

        this.user = null;
        this.online = false;
        this.socket = null;

        this.commands = null;
        this.buttons = null;

        this.sequence = null;
        this.heartbeatStarted = false;
        this.heartbeatTask = null;
    }

    async login() {
        // Authenticate with Discord REST API
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

        console.warn("[JSDA] Authenticated as " + this.user.username);

        // Connect to Discord Gateway
        this.socket = await websocket.connect(
            "wss://gateway.discord.gg/?v=10&encoding=json"
        );

        const socket = this.socket;

        return new Promise((resolve, reject) => {
            socket.afterEvents.message.subscribe((event) => {
                const packet = JSON.parse(event.message);

                // Update sequence
                if (packet.s !== null) {
                    this.sequence = packet.s;
                }

                // HELLO
                if (packet.op === 10 && !this.heartbeatStarted) {
                    this.heartbeatStarted = true;

                    const interval = packet.d.heartbeat_interval;
                    const ticks = Math.max(1, Math.floor(interval / 50));

                    // Start heartbeat
                    system.runTimeout(() => {
                        if (!socket.isOpen) return;

                        socket.send(JSON.stringify({
                            op: 1,
                            d: this.sequence
                        }));

                        this.heartbeatTask = system.runInterval(() => {
                            if (!socket.isOpen) return;

                            socket.send(JSON.stringify({
                                op: 1,
                                d: this.sequence
                            }));
                        }, ticks);
                    }, Math.floor(Math.random() * ticks));

                    // IDENTIFY
                    socket.send(JSON.stringify({
                        op: 2,
                        d: {
                            token: this.token,
                            intents: this.intents,
                            properties: {
                                os: "linux",
                                browser: "JSDA",
                                device: "JSDA"
                            }
                        }
                    }));

                    console.warn("[JSDA] IDENTIFY sent!");
                }

                // READY
                if (packet.t === "READY") {
                    this.user = packet.d.user;
                    this.online = true;

                    console.warn("[JSDA] Bot is ONLINE!");
                    console.warn(
                        "[JSDA] Logged in as " + this.user.username
                    );

                    resolve(this.user);
                }

                // HEARTBEAT ACK
                if (packet.op === 11) {
                    // Heartbeat acknowledged
                }

                // INTERACTIONS
                if (packet.t === "INTERACTION_CREATE") {
                    const data = packet.d;

                    if (data.type === 2 && this.commands) {
                        this.commands.handle(data);
                    }

                    if (data.type === 3 && this.buttons) {
                        this.buttons.handle(data);
                    }
                }
            });

            // CONNECTION CLOSED
            socket.afterEvents.close.subscribe(() => {
                this.online = false;
                this.socket = null;
                this.heartbeatStarted = false;

                if (this.heartbeatTask !== null) {
                    system.clearRun(this.heartbeatTask);
                    this.heartbeatTask = null;
                }

                console.warn("[JSDA] Gateway connection closed!");
            });
        });
    }
}

export { Client, Commands, Buttons, TextChannel }