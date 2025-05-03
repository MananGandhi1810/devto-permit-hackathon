import { Router } from "express";
import {
    listContainersHandler,
    startContainerHandler,
    stopContainerHandler,
    killContainerHandler,
    restartContainerHandler,
    getContainerLogsHandler,
    spawnContainerHandler,
    removeContainerHandler,
    checkContainerPermissionHandler,
} from "../handlers/container.js";
import { accessControl } from "../middlewares/access-control.js";
import { checkAuth } from "../middlewares/auth.js";

const router = Router();

router.get(
    "/",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "list",
            resource: "Container",
        }),
    listContainersHandler,
);
router.post(
    "/:id/start",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "start",
            resource: "Container",
        }),
    startContainerHandler,
);
router.post(
    "/:id/stop",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "stop",
            resource: "Container",
        }),
    stopContainerHandler,
);
router.post(
    "/:id/kill",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "kill",
            resource: "Container",
        }),
    killContainerHandler,
);
router.post(
    "/:id/restart",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "restart",
            resource: "Container",
        }),
    restartContainerHandler,
);
router.get(
    "/:id/logs",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "view-logs",
            resource: "Container",
        }),
    getContainerLogsHandler,
);
router.post(
    "/spawn",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "spawn",
            resource: "Container",
        }),
    spawnContainerHandler,
);
router.delete(
    "/:id",
    checkAuth,
    (req, res, next) =>
        accessControl(req, res, next, {
            action: "remove",
            resource: "Container",
        }),
    removeContainerHandler,
);

router.get("/check-permission", checkAuth, checkContainerPermissionHandler);

export default router;
