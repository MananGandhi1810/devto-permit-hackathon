import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

function AuditLogs({ logs }) {
    const [actionFilter, setActionFilter] = useState("");
    const [userFilter, setUserFilter] = useState("");
    const [filteredLogs, setFilteredLogs] = useState(logs);

    useEffect(() => {
        const filtered = logs.filter((log) => {
            const matchesAction =
                !actionFilter ||
                log.action.toLowerCase().includes(actionFilter.toLowerCase());
            const matchesUser =
                !userFilter ||
                log.user.name.toLowerCase().includes(userFilter.toLowerCase());
            return matchesAction && matchesUser;
        });

        setFilteredLogs(filtered);
    }, [logs, actionFilter, userFilter]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div>
            <div className="flex gap-4 mb-4 flex-col md:flex-row">
                <div className="flex-1">
                    <label
                        htmlFor="action-filter"
                        className="block text-sm font-medium mb-1"
                    >
                        Filter by Action
                    </label>
                    <div className="relative">
                        <input
                            id="action-filter"
                            type="text"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            placeholder="Filter actions..."
                            className="flex h-10 w-full rounded-md border border-input bg-zinc-800 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <label
                        htmlFor="user-filter"
                        className="block text-sm font-medium mb-1"
                    >
                        Filter by User
                    </label>
                    <div className="relative">
                        <input
                            id="user-filter"
                            type="text"
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            placeholder="Filter users..."
                            className="flex h-10 w-full rounded-md border border-input bg-zinc-800 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-scroll">
                <Table>
                    <TableHeader>
                        <TableRow className="border-zinc-700">
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <TableRow
                                    key={log.id}
                                    className="border-zinc-700"
                                >
                                    <TableCell>{log.user.name}</TableCell>
                                    <TableCell>{log.action}</TableCell>
                                    <TableCell className="max-w-[300px] text-ellipsis overflow-clip">
                                        {log.details || "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(log.timestamp)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="text-center text-gray-400"
                                >
                                    No audit logs found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default AuditLogs;
