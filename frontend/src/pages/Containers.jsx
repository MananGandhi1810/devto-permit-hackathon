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
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState({});
    const [showLogs, setShowLogs] = useState({});
    const pollRef = useRef();

    const { toast } = useToast();

    const fetchContainers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/containers");
            setContainers(res.data.data);
        } catch (e) {
            toast({
                title: "Error",
                description: "Failed to fetch containers",
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchContainers();
        pollRef.current = setInterval(fetchContainers, 5000);
        return () => clearInterval(pollRef.current);
    }, []);

    const handleSpawn = async (e) => {
        e.preventDefault();
        setSpawnLoading(true);
        try {
            await api.post("/containers/spawn", {
                image,
                name,
                ports: ports ? ports.split(",") : [],
                volumes: volumes ? volumes.split(",") : [],
                env: env ? env.split(",") : [],
            });
            toast({ title: "Success", description: "Container spawned" });
            setShowSpawn(false);
            setImage("");
            setName("");
            setPorts("");
            setVolumes("");
            setEnv("");
            fetchContainers();
        } catch {
            toast({ title: "Error", description: "Failed to spawn container" });
        }
        setSpawnLoading(false);
    };

    const handleShowLogs = (id) => {
        setShowLogs((prev) => ({ ...prev, [id]: !prev[id] }));
        if (!showLogs[id]) {
            const socket = io(process.env.SERVER_URL);
            socket.emit("subscribeToContainer", id);
            socket.on(`container-logs:${id}`, (log) => {
                setLogs((prev) => ({
                    ...prev,
                    [id]: (prev[id] || "") + log,
                }));
            });
            api.get(`/containers/${id}/logs`);
        }
    };

    return (
        <div className="p-6 bg-black min-h-full-w-nav text-white">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Docker Containers</h2>
                <Dialog open={showSpawn} onOpenChange={setShowSpawn}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={() => setShowSpawn(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
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
            </div>
            <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {containers.map((container) => (
                    <Card
                        onClick={() => handleShowLogs(container.Id)}
                        key={container.Id}
                        className={`${getCardBg(container.State)} border-2 ${
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
                                    {container.Names?.[0].replace("/", "") ||
                                        container.Id}
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
                ))}
            </div>
        </div>
    );
}

export default Containers;
