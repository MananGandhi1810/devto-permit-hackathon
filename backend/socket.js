import { Server } from "socket.io";
import Docker from "dockerode";

let io;
const docker = new Docker();

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

        socket.on("disconnect", () => {
            console.log("User disconnected", socket.id);
        });
    });
};

export { initializeSocket, io };
