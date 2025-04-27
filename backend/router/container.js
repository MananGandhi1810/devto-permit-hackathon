import { Router } from "express";
import {
    listContainersHandler,
    startContainerHandler,
    stopContainerHandler,
    killContainerHandler,
    restartContainerHandler, // Import the new handler
    getContainerLogsHandler,
    spawnContainerHandler,
    removeContainerHandler,
} from "../handlers/container.js";

const router = Router();

router.get("/", listContainersHandler);
router.post("/:id/start", startContainerHandler);
router.post("/:id/stop", stopContainerHandler);
router.post("/:id/kill", killContainerHandler);
router.post("/:id/restart", restartContainerHandler); // Add the restart route
router.get("/:id/logs", getContainerLogsHandler);
router.post("/spawn", spawnContainerHandler);
router.delete("/:id", removeContainerHandler);

export default router;
