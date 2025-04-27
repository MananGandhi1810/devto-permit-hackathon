import { Server } from "socket.io";
import Docker from "dockerode";

let io;
const docker = new Docker();
const statsStreams = {};

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        console.log("A user connected", socket.id);

        socket.on("subscribeToContainer", (containerId) => {
            console.log(
                `User ${socket.id} subscribed to container ${containerId}`,
            );
            socket.join(`container:${containerId}`);
        });

        socket.on("unsubscribeFromContainer", (containerId) => {
            console.log(
                `User ${socket.id} unsubscribed from container ${containerId}`,
            );
            socket.leave(`container:${containerId}`);
            const room = io.sockets.adapter.rooms.get(`container:${containerId}`);
            if ((!room || room.size === 0) && statsStreams[containerId]) {
                try {
                    statsStreams[containerId].stream.destroy();
                } catch {}
                delete statsStreams[containerId];
            }
        });

        socket.on("getContainerStats", async ({ id }) => {
            try {
                socket.join(`container:${id}`);
                if (statsStreams[id]) {
                    return;
                }
                const container = docker.getContainer(id);
                const statsStream = await container.stats({ stream: true });
                statsStreams[id] = {
                    stream: statsStream,
                };

                statsStream.on("data", (stat) => {
                    io.to(`container:${id}`).emit(`container-stats:${id}`, stat.toString());
                });

                statsStream.on("error", () => {
                    if (statsStreams[id]) {
                        try {
                            statsStreams[id].stream.destroy();
                        } catch {}
                        delete statsStreams[id];
                    }
                });
            } catch (e) {}
        });

        socket.on("disconnect", () => {
            console.log("User disconnected", socket.id);
            for (const [containerId, entry] of Object.entries(statsStreams)) {
                const room = io.sockets.adapter.rooms.get(`container:${containerId}`);
                if (!room || room.size === 0) {
                    try {
                        entry.stream.destroy();
                    } catch {}
                    delete statsStreams[containerId];
                }
            }
        });

        socket.on("container-exec", async ({ containerId }) => {
            try {
                const container = docker.getContainer(containerId);
                const exec = await container.exec({
                    Cmd: ["/bin/sh"],
                    AttachStdin: true,
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: true,
                });
                const stream = await exec.start({ hijack: true, stdin: true });

                socket.on("container-stdin", ({ input }) => {
                    stream.write(input);
                });

                stream.on("data", (chunk) => {
                    socket.emit("container-stdout", {
                        output: chunk.toString("utf8"),
                    });
                });

                stream.on("end", () => {
                    socket.emit("container-exit", { code: 0 });
                });

                stream.on("error", () => {
                    socket.emit("container-exit", { code: 1 });
                });

                socket.on("disconnect", () => {
                    try {
                        stream.end();
                    } catch {}
                });
            } catch (e) {
                socket.emit("container-stdout", {
                    output: "[Error opening shell]\r\n",
                });
                socket.emit("container-exit", { code: 1 });
            }
        });
    });
};

export { initializeSocket, io };
