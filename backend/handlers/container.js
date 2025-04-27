import Docker from "dockerode";
import dotenv from "dotenv";
import { io } from "../socket.js";

dotenv.config();

const docker = new Docker();

export const listContainersHandler = async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        res.status(200).json({
            success: true,
            message: "Containers listed successfully",
            data: containers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to list containers",
            error: error.message,
        });
    }
};

export const startContainerHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);
        await container.start();
        res.status(200).json({
            success: true,
            message: "Container started successfully",
            data: null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to start container",
            error: error.message,
        });
    }
};

export const stopContainerHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);
        await container.stop();
        res.status(200).json({
            success: true,
            message: "Container stopped successfully",
            data: null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to stop container",
            error: error.message,
        });
    }
};

export const killContainerHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);
        await container.kill();
        res.status(200).json({
            success: true,
            message: "Container killed successfully",
            data: null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to kill container",
            error: error.message,
        });
    }
};

export const restartContainerHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);
        await container.restart();
        res.status(200).json({
            success: true,
            message: "Container restarted successfully",
            data: null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to restart container",
            error: error.message,
        });
    }
};

export const getContainerLogsHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);

        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            since: 0,
        });

        logStream.on("data", function (chunk) {
            io.to(`container:${id}`).emit(
                `container-logs:${id}`,
                chunk.toString("utf8"),
            );
        });

        res.status(200).json({
            success: true,
            message: "Log stream started",
            data: null,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to get container logs",
            error: error.message,
        });
    }
};

export const spawnContainerHandler = async (req, res) => {
    const { image, name, ports, volumes, env } = req.body;

    if (!image) {
        return res.status(400).json({
            success: false,
            message: "Image is required",
            data: null,
        });
    }

    let imageExists = true;
    try {
        await docker.getImage(image).inspect();
    } catch (e) {
        imageExists = false;
    }

    try {
        if (!imageExists) {
            await new Promise((resolve, reject) => {
                docker.pull(image, (err, stream) => {
                    if (err) {
                        return reject(err);
                    }
                    docker.modem.followProgress(stream, (err, output) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve(output);
                    });
                });
            });
        }

        const containerConfig = {
            Image: image,
            name: name,
            ExposedPorts: {},
            HostConfig: {
                PortBindings: {},
            },
            Volumes: {},
            Env: env,
        };

        if (ports && Array.isArray(ports)) {
            ports.forEach((port) => {
                const [containerPort, hostPort] = port.split(":");
                containerConfig.ExposedPorts[`${containerPort}/tcp`] = {};
                containerConfig.HostConfig.PortBindings[
                    `${containerPort}/tcp`
                ] = [{ HostPort: hostPort }];
            });
        }

        if (volumes && Array.isArray(volumes)) {
            volumes.forEach((volume) => {
                const [hostPath, containerPath] = volume.split(":");
                containerConfig.Volumes[containerPath] = {};
                containerConfig.HostConfig.Binds = [
                    `${hostPath}:${containerPath}`,
                ];
            });
        }

        const container = await docker.createContainer(containerConfig);
        await container.start();

        const statsStream = await container.stats({ stream: true });

        statsStream.on("data", (stat) => {
            console.log(stat);
            io.to(`container:${container.id}`).emit(
                `container-stats:${container.id}`,
                stat,
            );
        });

        res.status(201).json({
            success: true,
            message: "Container spawned successfully",
            data: { id: container.id },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to spawn container",
            error: error.message,
        });
    }
};

export async function removeContainerHandler(req, res) {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);
        await container.remove({ force: true });
        res.status(200).json({ message: "Container removed successfully" });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to remove container",
            error: error.message,
        });
    }
}
