import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";

function UsersTable({ users, roles, onUserUpdate }) {
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const { toast } = useToast();

    const handleRoleChange = async (userId, newRoles) => {
        try {
            setUpdatingUserId(userId);

            const response = await api.post("/admin/users/role", {
                userId,
                roles: newRoles,
            });

            if (response.data.success) {
                toast({
                    title: "Success",
                    description: "User roles updated successfully",
                });

                if (onUserUpdate) {
                    const updatedUser = { ...users.find(u => u.id === userId), roles: newRoles };
                    onUserUpdate(updatedUser);
                }
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

    return (
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
                        <TableRow
                            key={u.id}
                            className="border-zinc-700"
                        >
                            <TableCell className="flex flex-row align-middle h-full">
                                {u.name}{" "}
                                {updatingUserId === u.id && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                {u.isVerified ? (
                                    <span className="text-green-500">
                                        Verified
                                    </span>
                                ) : (
                                    <span className="text-yellow-500">
                                        Not Verified
                                    </span>
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
                                                checked={u.roles.includes(
                                                    role.value,
                                                )}
                                                onCheckedChange={(
                                                    checked,
                                                ) => {
                                                    const newRoles =
                                                        checked
                                                            ? [
                                                                ...u.roles,
                                                                role.value,
                                                            ]
                                                            : u.roles.filter(
                                                                (r) =>
                                                                    r !==
                                                                    role.value,
                                                            );
                                                    handleRoleChange(
                                                        u.id,
                                                        newRoles,
                                                    );
                                                }}
                                                className="border-white border-1"
                                                disabled={
                                                    updatingUserId === u.id
                                                }
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
                            <TableCell>
                                {formatDate(u.createdAt)}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell
                            colSpan={5}
                            className="text-center text-gray-400"
                        >
                            No users found
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

export default UsersTable;
