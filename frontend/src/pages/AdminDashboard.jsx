import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import UsersTable from "@/components/custom/UsersTable";
import AuditLogs from "@/components/custom/AuditLogs";

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionError, setPermissionError] = useState(null);
    const { toast } = useToast();
    const navigate = useNavigate();

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

    const handleUserUpdate = (updatedUser) => {
        setUsers((prevUsers) =>
            prevUsers.map((user) =>
                user.id === updatedUser.id ? updatedUser : user,
            ),
        );
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
                            <TabsTrigger value="audit-logs">
                                Audit Logs
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="users">
                            <UsersTable
                                users={users}
                                roles={roles}
                                onUserUpdate={handleUserUpdate}
                            />
                        </TabsContent>
                        <TabsContent value="audit-logs">
                            <AuditLogs logs={auditLogs} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

export default AdminDashboard;
