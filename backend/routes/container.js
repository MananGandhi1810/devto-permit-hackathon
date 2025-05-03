import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { checkContainerLimitHandler } from "../handlers/container.js";

const router = express.Router();

// Add this new route
router.get("/limit", authenticateToken, checkContainerLimitHandler);

export default router;