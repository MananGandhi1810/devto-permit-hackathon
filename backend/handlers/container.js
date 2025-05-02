import Docker from "dockerode";
import dotenv from "dotenv";
import { io } from "../utils/socket.js";
import permit from "../utils/permit.js";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

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
    const { id } = req.params;
    try {
        const container = docker.getContainer(id);
        await container.start();

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: "start",
                resource: "Container",
                details: `Started container with ID: ${id}`,
            },
        });

        res.status(200).json({
            success: true,
            message: "Container started successfully",
            data: null,
        });
    } catch (error) {
        console.error("Error starting container:", error);
        res.status(500).json({
            success: false,
            message: "Failed to start container",
            error: error.message,
        });
    }
};

export const stopContainerHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const container = docker.getContainer(id);
        await container.stop();

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: "stop",
                resource: "Container",
                details: `Stopped container with ID: ${id}`,
            },
        });

        res.status(200).json({
            success: true,
            message: "Container stopped successfully",
            data: null,
        });
    } catch (error) {
        console.error("Error stopping container:", error);
        res.status(500).json({
            success: false,
            message: "Failed to stop container",
            error: error.message,
        });
    }
};

export const killContainerHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const container = docker.getContainer(id);
        await container.kill();

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: "kill",
                resource: "Container",
                details: `Killed container with ID: ${id}`,
            },
        });

        res.status(200).json({
            success: true,
            message: "Container killed successfully",
            data: null,
        });
    } catch (error) {
        console.error("Error killing container:", error);
        res.status(500).json({
            success: false,
            message: "Failed to kill container",
            error: error.message,
        });
    }
};

export const restartContainerHandler = async (req, res) => {
    const { id } = req.params;
    try {
        const container = docker.getContainer(id);
        await container.restart();

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: "restart",
                resource: "Container",
                details: `Restarted container with ID: ${id}`,
            },
        });

        res.status(200).json({
            success: true,
            message: "Container restarted successfully",
            data: null,
        });
    } catch (error) {
        console.error("Error restarting container:", error);
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

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: "spawn",
                resource: "Container",
                details: `Spawned container with ID: ${container.id}`,
            },
        });

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
        console.error("Error spawning container:", error);
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

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: "remove",
                resource: "Container",
                details: `Removed container with ID: ${id}`,
            },
        });

        res.status(200).json({ message: "Container removed successfully" });
    } catch (error) {
        console.error("Error removing container:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove container",
            error: error.message,
        });
    }
}

export const checkContainerPermissionHandler = async (req, res) => {
    try {
        const { action } = req.query;
        const userId = req.user.id;

        if (!action) {
            return res.status(400).json({
                success: false,
                message: "Action is required",
                data: null,
            });
        }

        const isPermitted = await permit.check(userId, action, "Container");

        res.status(200).json({
            success: true,
            message: "Permission check completed",
            data: { permitted: isPermitted },
        });
    } catch (error) {
        console.error("Error checking permission:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check permission",
            error: error.message,
        });
    }
};
