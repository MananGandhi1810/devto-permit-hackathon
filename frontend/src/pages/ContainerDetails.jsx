import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { io } from "socket.io-client";
import AuthContext from "@/providers/auth-context";

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function cleanLogText(text) {
    return text
        .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function ContainerDetails() {
    const { id } = useParams();
    const [container, setContainer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();
    const termRef = useRef(null);
    const socketRef = useRef(null);
    const [logs, setLogs] = useState("");
    const logsSocketRef = useRef(null);
    const [activeTab, setActiveTab] = useState("terminal");
    const [stats, setStats] = useState(null);
    const [permissions, setPermissions] = useState({
        start: false,
        stop: false,
        restart: false,
        kill: false,
        remove: false,
        "view-logs": false,
    });
    const { user } = useContext(AuthContext);
    const [terminalAccess, setTerminalAccess] = useState(false);

    useEffect(() => {
        api.get(`/containers`).then((res) => {
            const found = res.data.data.find((c) => c.Id === id);
            setContainer(found);
            setLoading(false);
        });
    }, [id]);

    useEffect(() => {
        const checkPermissions = async () => {
            const actions = [
                "start",
                "stop",
                "restart",
                "kill",
                "remove",
                "view-logs",
                "exec",
            ];
            try {
                const permissionResults = await Promise.all(
                    actions.map(async (action) => {
                        const res = await api.get(
                            `/containers/check-permission?action=${action}`,
                        );
                        return { action, permitted: res.data.data.permitted };
                    }),
                );

                const newPermissions = {};
                let terminalPermitted = false;

                permissionResults.forEach(({ action, permitted }) => {
                    if (action === "exec") {
                        terminalPermitted = permitted;
                    } else {
                        newPermissions[action] = permitted;
                    }
                });

                setPermissions(newPermissions);
                setTerminalAccess(terminalPermitted);
            } catch (error) {
                console.error("Failed to check permissions:", error);
                const defaultPermissions = {
                    start: false,
                    stop: false,
                    restart: false,
                    kill: false,
                    remove: false,
                    "view-logs": false,
                };
                setPermissions(defaultPermissions);
                setTerminalAccess(false);
            }
        };

        checkPermissions();
    }, []);

    useEffect(() => {
        if (!container) return;
        const token = user.token;
        const statsSocket = io(process.env.SERVER_URL, {
            path: "/socket.io",
            transports: ["websocket"],
            auth: {
                Authorization: `Bearer ${token}`,
            },
        });
        statsSocket.emit("subscribeToContainer", id);
        statsSocket.emit("getContainerStats", { id });

        statsSocket.on(`container-stats:${id}`, (stat) => {
            try {
                const parsed =
                    typeof stat === "string" ? JSON.parse(stat) : stat;
                setStats(parsed);
            } catch {}
        });
        return () => {
            statsSocket.emit("unsubscribeFromContainer", id);
            statsSocket.disconnect();
        };
    }, [container, id]);

    useEffect(() => {
        if (
            !container ||
            container.State !== "running" ||
            activeTab !== "terminal"
        )
            return;
        const term = new Terminal({
            fontSize: 14,
            theme: { background: "#1a1a1a" },
            cursorBlink: true,
        });
        term.open(termRef.current);

        const token = user.token;
        const socket = io(process.env.SERVER_URL, {
            path: "/socket.io",
            transports: ["websocket"],
            auth: {
                Authorization: `Bearer ${token}`,
            },
        });
        socket.emit("container-exec", { containerId: id });

        term.focus();

        term.onData((data) => {
            socket.emit("container-stdin", { containerId: id, input: data });
        });

        socket.on("container-stdout", ({ output }) => {
            term.write(output);
        });

        socket.on("container-exit", ({ code }) => {
            term.write(`\r\n[Process exited with code ${code}]\r\n`);
            socket.disconnect();
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            term.dispose();
        };
    }, [container, id, activeTab]);

    useEffect(() => {
        if (!container || activeTab !== "logs") return;
        const token = user.token;
        const logsSocket = io(process.env.SERVER_URL, {
            path: "/socket.io",
            transports: ["websocket"],
            auth: {
                Authorization: `Bearer ${token}`,
            },
        });
        logsSocket.emit("subscribeToContainer", id);
        logsSocket.on(`container-logs:${id}`, (log) => {
            setLogs((prev) => prev + log);
        });
        api.get(`/containers/${id}/logs`);
        logsSocketRef.current = logsSocket;
        return () => {
            logsSocket.emit("unsubscribeFromContainer", id);
            logsSocket.disconnect();
        };
    }, [container, id, activeTab]);

    const handleAction = async (action) => {
        setActionLoading(true);
        try {
            await api.post(`/containers/${id}/${action}`);
            toast({ title: "Success", description: `Container ${action}ed` });
            const res = await api.get(`/containers`);
            const found = res.data.data.find((c) => c.Id === id);
            setContainer(found);
        } catch (error) {
            const description =
                error.response?.status === 403
                    ? "You do not have permission to perform this action."
                    : `Failed to ${action} container`;
            toast({
                title: "Error",
                description: description,
                variant: "destructive",
            });
        }
        setActionLoading(false);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/containers/${id}`);
            toast({
                title: "Success",
                description: "Container deleted successfully",
            });
            setContainer(null);
        } catch (error) {
            const description =
                error.response?.status === 403
                    ? "You do not have permission to delete this container."
                    : "Failed to delete container";
            toast({
                title: "Error",
                description: description,
                variant: "destructive",
            });
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!container) return <div className="p-6">Container not found</div>;

    const ports = (container.Ports || []).filter(
        (p) => p.PublicPort || p.PrivatePort,
    );

    return (
        <div className="p-6 h-full-w-nav">
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle>
                        {container.Names?.[0].replace("/", "") || container.Id}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                        <div>
                            <span className="font-semibold">Status:</span>{" "}
                            {container.State}
                        </div>
                        <div>
                            <span className="font-semibold">Image:</span>{" "}
                            {container.Image}
                        </div>
                        <div>
                            <span className="font-semibold">ID:</span>{" "}
                            {container.Id}
                        </div>
                        {ports.length > 0 && (
                            <div className="sm:col-span-2">
                                <span className="font-semibold">
                                    Exposed Ports:
                                </span>
                                <ul className="ml-2 list-disc">
                                    {ports.map((port, idx) => (
                                        <li key={idx}>
                                            {port.IP && <span>{port.IP}:</span>}
                                            {port.PublicPort
                                                ? `${port.PublicPort}->${port.PrivatePort}/${port.Type}`
                                                : `${port.PrivatePort}/${port.Type}`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {container.State === "running" && stats && (
                            <div className="sm:col-span-2">
                                <span className="font-semibold">
                                    Resource Usage:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 ml-2">
                                    <div>
                                        <span className="font-medium">
                                            CPU %:{" "}
                                        </span>
                                        {stats.cpu_stats && stats.precpu_stats
                                            ? (() => {
                                                  const cpuDelta =
                                                      stats.cpu_stats.cpu_usage
                                                          .total_usage -
                                                      stats.precpu_stats
                                                          .cpu_usage
                                                          .total_usage;
                                                  const systemDelta =
                                                      stats.cpu_stats
                                                          .system_cpu_usage -
                                                      stats.precpu_stats
                                                          .system_cpu_usage;
                                                  const cpuPercent =
                                                      systemDelta > 0 &&
                                                      cpuDelta > 0
                                                          ? (
                                                                (cpuDelta /
                                                                    systemDelta) *
                                                                stats.cpu_stats
                                                                    .online_cpus *
                                                                100.0
                                                            ).toFixed(2)
                                                          : "0.00";
                                                  return cpuPercent;
                                              })()
                                            : "N/A"}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Memory:{" "}
                                        </span>
                                        {stats.memory_stats
                                            ? `${formatBytes(
                                                  stats.memory_stats.usage,
                                              )} / ${formatBytes(
                                                  stats.memory_stats.limit,
                                              )}`
                                            : "N/A"}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Network:{" "}
                                        </span>
                                        {stats.networks
                                            ? Object.values(stats.networks)
                                                  .map((net, i) => (
                                                      <span key={i}>
                                                          RX:{" "}
                                                          {formatBytes(
                                                              net.rx_bytes,
                                                          )}
                                                          , TX:{" "}
                                                          {formatBytes(
                                                              net.tx_bytes,
                                                          )}
                                                      </span>
                                                  ))
                                                  .reduce((prev, curr) => [
                                                      prev,
                                                      " | ",
                                                      curr,
                                                  ])
                                            : "N/A"}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button
                        onClick={() => handleAction("start")}
                        disabled={
                            actionLoading ||
                            container.State === "running" ||
                            !permissions.start
                        }
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Start
                    </Button>
                    <Button
                        onClick={() => handleAction("stop")}
                        disabled={
                            actionLoading ||
                            container.State !== "running" ||
                            !permissions.stop
                        }
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                        Stop
                    </Button>
                    <Button
                        onClick={() => handleAction("restart")}
                        disabled={
                            actionLoading ||
                            container.State !== "running" ||
                            !permissions.restart
                        }
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        Restart
                    </Button>
                    <Button
                        onClick={() => handleAction("kill")}
                        disabled={
                            actionLoading ||
                            container.State !== "running" ||
                            !permissions.kill
                        }
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        Kill
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!permissions.remove}
                        className="bg-gray-800 hover:bg-gray-900 text-white"
                    >
                        Delete Container
                    </Button>
                </CardFooter>
            </Card>
            <div className="flex gap-4">
                <button
                    className={`px-4 py-2 rounded-t ${
                        activeTab === "terminal"
                            ? "bg-gray-800 text-white"
                            : "bg-gray-200 text-gray-700"
                    } ${
                        !terminalAccess ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => setActiveTab("terminal")}
                    disabled={!terminalAccess}
                >
                    Terminal
                </button>
                <button
                    className={`px-4 py-2 rounded-t ${
                        activeTab === "logs"
                            ? "bg-gray-800 text-white"
                            : "bg-gray-200 text-gray-700"
                    } ${
                        !permissions["view-logs"]
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                    }`}
                    onClick={() => setActiveTab("logs")}
                    disabled={!permissions["view-logs"]}
                >
                    Logs
                </button>
            </div>
            <div className="flex flex-row gap-4">
                <div
                    className={`w-full ${
                        activeTab === "terminal" ? "" : "hidden"
                    }`}
                >
                    {container.State === "running" ? (
                        <div>
                            <div
                                ref={termRef}
                                style={{
                                    height: 400,
                                    background: "#1a1a1a",
                                    borderRadius: 8,
                                }}
                            />
                        </div>
                    ) : (
                        <div className="text-red-500">
                            Container is not running.
                        </div>
                    )}
                </div>
                <div
                    className={`w-full ${activeTab === "logs" ? "" : "hidden"}`}
                >
                    <pre
                        className="p-4 bg-black text-white text-xs max-h-96 overflow-auto rounded"
                        style={{ height: 400, whiteSpace: "pre-wrap" }}
                    >
                        {logs ? cleanLogText(logs) : "Waiting for logs..."}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export default ContainerDetails;
