import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { io } from "socket.io-client";
import { Terminal, XCircle } from "lucide-react";

function getStatusColor(state) {
    if (state === "running") return "text-green-600";
    if (state === "exited") return "text-red-500";
    if (state === "paused") return "text-yellow-500";
    return "text-gray-400";
}

function getCardBg(state) {
    if (state === "running") return "bg-green-50";
    if (state === "exited") return "bg-red-50";
    if (state === "paused") return "bg-yellow-50";
    return "bg-gray-50";
}

function Containers() {
    const [showSpawn, setShowSpawn] = useState(false);
    const [spawnLoading, setSpawnLoading] = useState(false);
    const [image, setImage] = useState("");
    const [name, setName] = useState("");
    const [ports, setPorts] = useState("");
    const [volumes, setVolumes] = useState("");
    const [env, setEnv] = useState("");
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionError, setPermissionError] = useState(null);
    const [logs, setLogs] = useState({});
    const [showLogs, setShowLogs] = useState({});
    const [canSpawn, setCanSpawn] = useState(false);
    const pollRef = useRef();

    const { toast } = useToast();

    const checkSpawnPermission = async () => {
        try {
            const res = await api.get(
                "/containers/check-permission?action=spawn",
            );
            setCanSpawn(res.data.data?.permitted || false);
        } catch (error) {
            console.error("Failed to check spawn permission:", error);
            setCanSpawn(false);
        }
    };

    const fetchContainers = async () => {
        try {
            const res = await api.get("/containers");
            if (permissionError) setPermissionError(null);
            if (res.status === 403) {
                setPermissionError(
                    "You do not have permission to view containers.",
                );
                setContainers([]);
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            }
            setContainers(res.data.data ?? []);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch containers",
                variant: "destructive",
            });
            console.error("Failed to fetch containers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContainers();
        checkSpawnPermission();

        const timerId = setTimeout(() => {
            if (!permissionError && !pollRef.current) {
                pollRef.current = setInterval(fetchContainers, 5000);
            }
        }, 0);

        return () => {
            clearTimeout(timerId);
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, []);

    const handleSpawn = async (e) => {
        e.preventDefault();
        setSpawnLoading(true);
        try {
            const res = await api.post("/containers/spawn", {
                image,
                name,
                ports: ports
                    ? ports
                          .split(",")
                          .map((p) => p.trim())
                          .filter((p) => p)
                    : [],
                volumes: volumes
                    ? volumes
                          .split(",")
                          .map((v) => v.trim())
                          .filter((v) => v)
                    : [],
                env: env
                    ? env
                          .split(",")
                          .map((e) => e.trim())
                          .filter((e) => e)
                    : [],
            });
            if (res.status == 500) {
                throw new Error(res.data.error);
            }
            if (res.status == 403) {
                throw new Error(res.data.message);
            }
            toast({ title: "Success", description: "Container spawned" });
            setShowSpawn(false);
            setImage("");
            setName("");
            setPorts("");
            setVolumes("");
            setEnv("");
            fetchContainers();
        } catch (error) {
            const description =
                error.response?.status === 403
                    ? "You do not have permission to spawn containers."
                    : error.response?.data?.message ||
                      "Failed to spawn container";
            toast({
                title: "Error",
                description: description,
                variant: "destructive",
            });
        }
        setSpawnLoading(false);
    };

    return (
        <div className="p-6 bg-black min-h-full-w-nav text-white">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Docker Containers</h2>
                {!permissionError && (
                    <Dialog open={showSpawn} onOpenChange={setShowSpawn}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => setShowSpawn(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!canSpawn}
                                title={
                                    !canSpawn
                                        ? "You don't have permission to spawn containers"
                                        : ""
                                }
                            >
                                + Spawn Container
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#18181b] text-white">
                            <DialogHeader>
                                <DialogTitle>Spawn New Container</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={handleSpawn}
                                className="flex flex-col gap-3"
                            >
                                <Input
                                    className="bg-zinc-900 text-white border-zinc-700"
                                    placeholder="Image (e.g. nginx:latest)"
                                    value={image}
                                    onChange={(e) => setImage(e.target.value)}
                                    required
                                />
                                <Input
                                    className="bg-zinc-900 text-white border-zinc-700"
                                    placeholder="Name (optional)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <Input
                                    className="bg-zinc-900 text-white border-zinc-700"
                                    placeholder="Ports (e.g. 80:8080,443:8443)"
                                    value={ports}
                                    onChange={(e) => setPorts(e.target.value)}
                                />
                                <Input
                                    className="bg-zinc-900 text-white border-zinc-700"
                                    placeholder="Volumes (e.g. /host:/container)"
                                    value={volumes}
                                    onChange={(e) => setVolumes(e.target.value)}
                                />
                                <Input
                                    className="bg-zinc-900 text-white border-zinc-700"
                                    placeholder="Env (e.g. VAR1=val1,VAR2=val2)"
                                    value={env}
                                    onChange={(e) => setEnv(e.target.value)}
                                />
                                <DialogFooter>
                                    <Button
                                        type="submit"
                                        disabled={spawnLoading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {spawnLoading ? "Spawning..." : "Spawn"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {loading && <p>Loading containers...</p>}

            {!loading && permissionError && (
                <div className="mt-10 flex flex-col items-center justify-center text-red-500">
                    <XCircle className="h-16 w-16 mb-4" />
                    <p className="text-xl font-semibold">Permission Denied</p>
                    <p className="text-center">{permissionError}</p>
                </div>
            )}

            {!loading && !permissionError && (
                <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {containers.length > 0 ? (
                        containers.map((container) => (
                            <Card
                                key={container.Id}
                                className={`${getCardBg(
                                    container.State,
                                )} border-2 ${
                                    container.State === "running"
                                        ? "border-green-400"
                                        : container.State === "exited"
                                        ? "border-red-400"
                                        : container.State === "paused"
                                        ? "border-yellow-400"
                                        : "border-gray-700"
                                } bg-zinc-900 text-white`}
                            >
                                <CardHeader className="flex flex-row justify-between items-center">
                                    <CardTitle>
                                        <Link
                                            to={`/containers/${container.Id}`}
                                            className="hover:underline text-white"
                                        >
                                            {container.Names?.[0].replace(
                                                "/",
                                                "",
                                            ) || container.Id}
                                        </Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className={`font-semibold ${getStatusColor(
                                            container.State,
                                        )}`}
                                    >
                                        Status: {container.State}
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-300">
                                            Image:
                                        </span>{" "}
                                        {container.Image}
                                    </div>
                                    <div className="max-w-max overflow-hidden text-ellipsis">
                                        <span className="font-medium text-gray-300">
                                            ID:
                                        </span>{" "}
                                        {container.Id}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <p className="mt-4 text-gray-400 col-span-full">
                            No containers found.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default Containers;
