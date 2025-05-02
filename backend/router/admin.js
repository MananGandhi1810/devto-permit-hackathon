import { Router } from "express";
import {
    getUsersHandler,
    updateUserRoleHandler,
    getAvailableRolesHandler,
    checkAdminAccessHandler,
    getAuditLogsHandler,
} from "../handlers/admin.js";
import { checkAuth } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/admin-auth.js";

const router = Router();

router.get("/check-access", checkAuth, checkAdminAccessHandler);

router.use(checkAuth, isAdmin);

router.get("/users", getUsersHandler);

router.post("/users/role", updateUserRoleHandler);

router.get("/roles", getAvailableRolesHandler);

router.get("/audit-logs", getAuditLogsHandler);

export default router;
