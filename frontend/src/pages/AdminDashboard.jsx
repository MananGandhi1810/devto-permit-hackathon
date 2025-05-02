import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import AuthContext from "@/providers/auth-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [permissionError, setPermissionError] = useState(null);
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [usersResponse, rolesResponse] = await Promise.all([
                    api.get("/admin/users"),
                    api.get("/admin/roles"),
                ]);

                if (usersResponse.data.success) {
                    setUsers(usersResponse.data.data);
                    setPermissionError(null);
                }
                console.log(usersResponse.data.data);

                if (rolesResponse.data.success) {
                    setRoles(
                        rolesResponse.data.data.map((role) => ({
                            label: role.name || role.key,
                            value: role.key,
                        })),
                    );
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                if (error.response?.status === 403) {
                    setPermissionError(
                        "You do not have permission to access the admin dashboard.",
                    );
                    toast({
                        title: "Access Denied",
                        description:
                            "You need admin privileges to access this page.",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Error",
                        description: "Failed to load admin dashboard data.",
                        variant: "destructive",
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                const response = await api.get("/admin/audit-logs");
                if (response.data.success) {
                    setAuditLogs(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching audit logs:", error);
            }
            setTimeout(() => {
                fetchAuditLogs();
            }, 5000);
        };

        fetchAuditLogs();
    }, []);

    const handleRoleChange = async (userId, newRoles) => {
        try {
            setUpdatingUserId(userId);

            const response = await api.post("/admin/users/role", {
                userId,
                roles: newRoles,
            });

            if (response.data.success) {
                setUsers(
                    users.map((user) =>
                        user.id === userId
                            ? { ...user, roles: newRoles }
                            : user,
                    ),
                );

                toast({
                    title: "Success",
                    description: "User roles updated successfully",
                });
            }
        } catch (error) {
            console.error("Error updating role:", error);
            toast({
                title: "Error",
                description:
                    error.response?.data?.message ||
                    "Failed to update user role",
                variant: "destructive",
            });
        } finally {
            setUpdatingUserId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-full-w-nav">
                <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
        );
    }

    if (permissionError) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full-w-nav">
                <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-500">
                    Access Denied
                </h2>
                <p className="text-gray-400 mt-2">{permissionError}</p>
                <Button className="mt-6" onClick={() => navigate("/")}>
                    Return to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-black min-h-full-w-nav text-white">
            <Card className="bg-zinc-900 text-white border-zinc-700">
                <CardHeader>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription className="text-gray-400">
                        Manage users and view system activities
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs>
                        <TabsList>
                            <TabsTrigger value="users">Users</TabsTrigger>
                            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
                        </TabsList>
                        <TabsContent value="users">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-700">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length > 0 ? (
                                        users.map((u) => (
                                            <TableRow key={u.id} className="border-zinc-700">
                                                <TableCell className="flex flex-row align-middle h-full">
                                                    {u.name}{" "}
                                                    {updatingUserId === u.id && (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    )}
                                                </TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    {u.isVerified ? (
                                                        <span className="text-green-500">Verified</span>
                                                    ) : (
                                                        <span className="text-yellow-500">Not Verified</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="min-w-[250px]">
                                                    <div className="flex flex-wrap gap-2">
                                                        {roles.map((role) => (
                                                            <div
                                                                key={role.value}
                                                                className="flex items-center space-x-2 bg-zinc-800 p-2 rounded-md"
                                                            >
                                                                <Checkbox
                                                                    id={`${u.id}-${role.value}`}
                                                                    checked={u.roles.includes(role.value)}
                                                                    onCheckedChange={(checked) => {
                                                                        const newRoles = checked
                                                                            ? [...u.roles, role.value]
                                                                            : u.roles.filter((r) => r !== role.value);
                                                                        handleRoleChange(u.id, newRoles);
                                                                    }}
                                                                    className="border-white border-1"
                                                                    disabled={updatingUserId === u.id}
                                                                />
                                                                <label
                                                                    htmlFor={`${u.id}-${role.value}`}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                                >
                                                                    {role.label}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatDate(u.createdAt)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-gray-400">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="audit-logs">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-700">
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.length > 0 ? (
                                        auditLogs.map((log) => (
                                            <TableRow key={log.id} className="border-zinc-700">
                                                <TableCell>{log.user.email}</TableCell>
                                                <TableCell>{log.action}</TableCell>
                                                <TableCell>{log.resource}</TableCell>
                                                <TableCell className="max-w-[200px] text-ellipsis overflow-clip">
                                                    {log.details || "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-gray-400">
                                                No audit logs found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default AdminDashboard;
