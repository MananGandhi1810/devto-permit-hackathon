import permit from "../utils/permit.js";

const isAdmin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const isUserAdmin = (await permit.api.getAssignedRoles(userId))
            .map((r) => r.role)
            .includes("admin");

        if (!isUserAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Admin privileges required",
                data: null,
            });
        }

        next();
    } catch (error) {
        console.error("Admin authorization error:", error);
        res.status(500).json({
            success: false,
            message: "Admin authorization failed",
            error: error.message,
        });
    }
};

export { isAdmin };
