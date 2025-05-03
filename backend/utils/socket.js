import { Server } from "socket.io";
import Docker from "dockerode";
import permit from "./permit";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

let io;
const docker = new Docker();
const statsStreams = {};
const prisma = new PrismaClient();

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.use(async (socket, next) => {
        const token = socket.handshake.auth.Authorization?.split(" ")[1];

        if (!token) {
            return next(new Error("Authentication error: Missing token"));
        }

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            const user = await prisma.user.findUnique({
                where: {
                    id: decoded.id,
                    email: decoded.email,
                },
            });

            if (!user) {
                return next(new Error("Authentication error: Invalid user"));
            }

            socket.request.user = user;
            socket.permit = permit;
            next();
        } catch (error) {
            console.error("JWT verification error:", error);
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        socket.on("subscribeToContainer", async (containerId) => {
            const userId = socket.request.user.id;
            try {
                const isPermitted = await socket.permit.check(
                    userId,
                    "view-logs",
                    "Container",
                );

                if (!isPermitted) {
                    socket.emit("subscriptionFailed", {
                        message:
                            "You do not have permission to access this container.",
                    });
                    return;
                }
                socket.join(`container:${containerId}`);
            } catch (error) {
                console.error(
                    "Error checking permissions or subscribing to container:",
                    error,
                );
                socket.emit("subscriptionFailed", {
                    message: "Failed to subscribe to container.",
                });
            }
        });

        socket.on("unsubscribeFromContainer", (containerId) => {
            socket.leave(`container:${containerId}`);
            const room = io.sockets.adapter.rooms.get(
                `container:${containerId}`,
            );
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
                    io.to(`container:${id}`).emit(
                        `container-stats:${id}`,
                        stat.toString(),
                    );
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
            for (const [containerId, entry] of Object.entries(statsStreams)) {
                const room = io.sockets.adapter.rooms.get(
                    `container:${containerId}`,
                );
                if (!room || room.size === 0) {
                    try {
                        entry.stream.destroy();
                    } catch {}
                    delete statsStreams[containerId];
                }
            }
        });

        socket.on("container-exec", async ({ containerId }) => {
            const userId = socket.request.user.id;
            const isPermitted = await socket.permit.check(
                userId,
                "exec",
                "Container",
            );

            if (!isPermitted) {
                socket.emit("executionFailed", {
                    message:
                        "You do not have permission to execute commands on this container.",
                });
                return;
            }
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
