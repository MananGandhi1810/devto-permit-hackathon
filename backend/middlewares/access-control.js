import permit from "../utils/permit";

const accessControl = async (req, res, next, { action, resource }) => {
    const isPermitted = await permit.check(req.user.id, action, resource);
    console.log(req.user.id, action, resource, isPermitted);
    if (!isPermitted) {
        return res.status(403).json({
            success: false,
            message: "No permission",
            data: null,
        });
    }
    next();
};

export { accessControl };
