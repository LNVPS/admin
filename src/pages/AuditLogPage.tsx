import React, { useState, useEffect } from "react";
import { Card } from "../components/Card";
import { Table, SearchBar, Pagination } from "../components/Table";
import {
  ClockIcon,
  UserIcon,
  ServerIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface AuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  status: "success" | "warning" | "error";
  details: string;
}

export function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<AuditLogEntry[]>([
    {
      id: 1,
      timestamp: new Date().toISOString(),
      user: "npub1...abc",
      action: "CREATE",
      resource: "VM",
      resourceId: "vm-123",
      status: "success",
      details: "Created new VM instance",
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user: "npub1...def",
      action: "UPDATE",
      resource: "USER",
      resourceId: "user-456",
      status: "warning",
      details: "Modified user permissions",
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user: "npub1...ghi",
      action: "DELETE",
      resource: "VM",
      resourceId: "vm-789",
      status: "error",
      details: "Failed to delete VM instance",
    },
  ]);

  const ITEMS_PER_PAGE = 10;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <ShieldCheckIcon className="h-5 w-5 text-green-500" />;
      case "warning":
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case "USER":
        return <UserIcon className="h-5 w-5 text-blue-500" />;
      case "VM":
        return <ServerIcon className="h-5 w-5 text-blue-500" />;
      case "ROLE":
        return <KeyIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const columns = [
    {
      header: "Timestamp",
      key: "timestamp",
      render: (entry: AuditLogEntry) => (
        <div className="flex items-center">
          <ClockIcon className="mr-2 h-5 w-5 text-gray-400" />
          {new Date(entry.timestamp).toLocaleString()}
        </div>
      ),
    },
    {
      header: "User",
      key: "user",
      render: (entry: AuditLogEntry) => (
        <div className="flex items-center">
          <UserIcon className="mr-2 h-5 w-5 text-gray-400" />
          {entry.user}
        </div>
      ),
    },
    {
      header: "Action",
      key: "action",
      render: (entry: AuditLogEntry) => (
        <span
          className={`rounded px-2 py-1 text-xs font-medium
            ${
              entry.action === "CREATE"
                ? "bg-green-900/20 text-green-500"
                : entry.action === "DELETE"
                  ? "bg-red-900/20 text-red-500"
                  : "bg-blue-900/20 text-blue-500"
            }`}
        >
          {entry.action}
        </span>
      ),
    },
    {
      header: "Resource",
      key: "resource",
      render: (entry: AuditLogEntry) => (
        <div className="flex items-center">
          {getResourceIcon(entry.resource)}
          <span className="ml-2">
            {entry.resource} ({entry.resourceId})
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (entry: AuditLogEntry) => (
        <div className="flex items-center">
          {getStatusIcon(entry.status)}
          <span
            className={`ml-2 capitalize
              ${
                entry.status === "success"
                  ? "text-green-500"
                  : entry.status === "warning"
                    ? "text-yellow-500"
                    : "text-red-500"
              }`}
          >
            {entry.status}
          </span>
        </div>
      ),
    },
    { header: "Details", key: "details" },
  ];

  useEffect(() => {
    // In a real app, this would fetch data from an API
    setTotalEntries(100);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      </div>

      <Card>
        <div className="mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search audit log..."
          />
        </div>

        <Table columns={columns} data={logEntries} isLoading={isLoading} />

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalEntries / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
}
