import { Router } from "express";
import {
    listContainersHandler,
    startContainerHandler,
    stopContainerHandler,
    killContainerHandler,
    getContainerLogsHandler,
    spawnContainerHandler,
    removeContainerHandler,
} from "../handlers/container.js";

const router = Router();

router.get("/", listContainersHandler);
router.post("/:id/start", startContainerHandler);
router.post("/:id/stop", stopContainerHandler);
router.post("/:id/kill", killContainerHandler);
router.get("/:id/logs", getContainerLogsHandler);
router.post("/spawn", spawnContainerHandler);
router.delete("/:id", removeContainerHandler);

export default router;
