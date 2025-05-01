import { PrismaClient } from "@prisma/client";
import permit from "../utils/permit.js";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

export const checkAdminAccessHandler = async (req, res) => {
    try {
        const userId = req.user.id;
        const isUserAdmin = await permit.check(userId, "assign-role", "User");

        return res.status(200).json({
            success: isUserAdmin,
            message: isUserAdmin
                ? "User has admin access"
                : "User does not have admin access",
            data: { isAdmin: isUserAdmin },
        });
    } catch (error) {
        console.error("Admin access check error:", error);
        return res.status(500).json({
            success: false,
            message: "Error checking admin access",
            error: error.message,
        });
    }
};

export const getUsersHandler = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const usersWithRoles = await Promise.all(
            users.map(async (user) => {
                try {
                    const userRoles = await permit.api.getAssignedRoles(
                        user.id,
                    );

                    return {
                        ...user,
                        roles: userRoles.map((role) => role.role),
                    };
                } catch (error) {
                    console.error(
                        `Failed to get roles for user ${user.id}:`,
                        error,
                    );
                    return {
                        ...user,
                        roles: [],
                    };
                }
            }),
        );

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: usersWithRoles,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve users",
            error: error.message,
        });
    }
};

export const updateUserRoleHandler = async (req, res) => {
    const { userId, roles } = req.body;

    if (!userId || !roles || !Array.isArray(roles)) {
        return res.status(400).json({
            success: false,
            message: "User ID and roles array are required",
            data: null,
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
        }

        if (roles.length === 0) {
            roles.push("viewer");
        }

        const currentRoles = await permit.api.getAssignedRoles(userId);
        const currentRoleKeys = currentRoles.map((role) => role.role);

        const rolesToAdd = roles.filter(
            (role) => !currentRoleKeys.includes(role),
        );
        const rolesToRemove = currentRoleKeys.filter(
            (role) => !roles.includes(role),
        );

        await Promise.all(
            rolesToRemove.map(async (role) => {
                await permit.api.unassignRole({
                    user: userId,
                    role: role,
                    tenant: "default",
                });
            }),
        );

        await Promise.all(
            rolesToAdd.map(async (role) => {
                await permit.api.assignRole(
                    JSON.stringify({
                        user: userId,
                        role: role,
                        tenant: "default",
                    }),
                );
            }),
        );

        res.status(200).json({
            success: true,
            message: "User roles updated successfully",
            data: { userId, roles },
        });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update user role",
            error: error.message,
        });
    }
};

export const getAvailableRolesHandler = async (req, res) => {
    try {
        const roles = await permit.api.listRoles();

        res.status(200).json({
            success: true,
            message: "Roles retrieved successfully",
            data: roles,
        });
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve roles",
            error: error.message,
        });
    }
};
