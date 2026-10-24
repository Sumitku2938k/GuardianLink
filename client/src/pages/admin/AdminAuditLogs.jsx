import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Lock,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Server
} from "lucide-react";
import { getAuditLogs } from "@/services/auditLogService";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs({
        page: targetPage,
        limit: 15,
        search: searchQuery,
        actorRole: roleFilter,
        outcome: outcomeFilter
      });

      if (data && data.success) {
        setLogs(data.auditLogs || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data?.message || "Failed to load audit records.");
      }
    } catch (err) {
      console.error("[AdminAuditLogs] Error fetching logs:", err);
      const msg = err.response?.data?.message || err.message || "Failed to communicate with security audit service.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, outcomeFilter]);

  // Initial fetch and on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchLogs(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchLogs(pagination.page + 1);
    }
  };

  const getOutcomeBadge = (outcome) => {
    if (outcome === "success") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          SUCCESS
        </span>
      );
    }
    if (outcome === "denied") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
          DENIED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
        FAILURE
      </span>
    );
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "primary";
      case "police":
        return "info";
      case "ngo":
        return "secondary";
      case "parent":
        return "success";
      case "citizen":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Immutable Platform Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only security activity trail recording authentication, child management, cases, sightings, and NGO care operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchLogs(pagination.page)}
            variant="outline"
            size="sm"
            className="text-xs font-sans"
            leftIcon={RefreshCw}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Logs"}
          </Button>
        </div>
      </div>

      {/* IMMUTABLE LOG NOTICE */}
      <div className="p-3.5 rounded-xl bg-slate-100 border border-gray-200 text-slate-700 text-xs flex items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Audit logs are read-only, append-only security records protected by server validation and Mongoose immutability hooks.</span>
        </div>
        <span className="text-[11px] font-bold text-slate-500">
          Total Persisted: {pagination.total}
        </span>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Action, Entity ID, Actor Name, or Organization..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Roles</option>
            <option value="admin">Admin</option>
            <option value="police">Police</option>
            <option value="ngo">NGO</option>
            <option value="parent">Parent</option>
            <option value="citizen">Citizen</option>
            <option value="system">System</option>
            <option value="anonymous">Anonymous</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="denied">Denied</option>
          </select>

          {(searchQuery || roleFilter !== "All" || outcomeFilter !== "All") && (
            <Button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("All");
                setOutcomeFilter("All");
              }}
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button onClick={() => fetchLogs(pagination.page)} variant="outline" size="sm" className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* AUDIT LOG TABLE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Loading verified security audit records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={History}
              title="No Audit Records Found"
              description="No audit logs match the current search filters, or no security events have been recorded yet."
              actionLabel="Reset Search Filters"
              onAction={() => {
                setSearchQuery("");
                setRoleFilter("All");
                setOutcomeFilter("All");
              }}
            />
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4 font-bold">Event ID</th>
                <th className="py-3.5 px-4 font-bold">Timestamp</th>
                <th className="py-3.5 px-4 font-bold">Actor & Role</th>
                <th className="py-3.5 px-4 font-bold">Audit Action</th>
                <th className="py-3.5 px-4 font-bold">Entity Type & ID</th>
                <th className="py-3.5 px-4 font-bold">Outcome</th>
                <th className="py-3.5 px-4 font-bold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-indigo-700 text-[11px]">
                    {log.id ? log.id.slice(-8).toUpperCase() : "AUD-LOG"}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "medium"
                    }) : "N/A"}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-sans font-bold text-slate-900">{log.actorName || "System"}</div>
                    <Badge variant={getRoleBadgeVariant(log.actorRole)} size="sm">
                      {log.actorRole?.toUpperCase()}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 font-sans text-slate-800 font-semibold">
                    <span className="font-mono text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-gray-200">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                    <span className="text-slate-400">{log.entityType}:</span>{" "}
                    <strong className="text-slate-900">
                      {log.entityId ? (log.entityId.length > 14 ? `${log.entityId.slice(0, 12)}...` : log.entityId) : "N/A"}
                    </strong>
                  </td>

                  <td className="py-3.5 px-4">
                    {getOutcomeBadge(log.outcome)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Button
                      onClick={() => setSelectedLog(log)}
                      variant="outline"
                      size="sm"
                      className="text-xs font-sans"
                      leftIcon={Eye}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PAGINATION FOOTER */}
        {!loading && logs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-gray-200 text-xs font-sans">
            <div className="text-slate-500">
              Showing page <strong className="text-slate-900">{pagination.page}</strong> of{" "}
              <strong className="text-slate-900">{pagination.totalPages}</strong> ({pagination.total} total events)
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrevPage}
                disabled={pagination.page <= 1 || loading}
                variant="outline"
                size="sm"
                className="text-xs"
                leftIcon={ChevronLeft}
              >
                Previous
              </Button>

              <span className="font-mono text-xs text-slate-600 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>

              <Button
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages || loading}
                variant="outline"
                size="sm"
                className="text-xs"
                rightIcon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Event Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Security Activity Trail Record"
          subtitle={`Event ID: ${selectedLog.id}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2.5">
              <div>
                <span className="text-slate-400">Timestamp:</span>
                <strong className="text-slate-900 ml-2">
                  {selectedLog.timestamp ? new Date(selectedLog.timestamp).toISOString() : "N/A"}
                </strong>
              </div>

              <div>
                <span className="text-slate-400">Actor Identity:</span>
                <strong className="text-indigo-700 ml-2">
                  {selectedLog.actorName} ({selectedLog.actorRole})
                </strong>
                {selectedLog.actorId && (
                  <span className="text-slate-400 ml-1">ID: {selectedLog.actorId}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400">Action:</span>
                <strong className="text-slate-900 ml-2">{selectedLog.action}</strong>
              </div>

              <div>
                <span className="text-slate-400">Target Entity:</span>
                <strong className="text-slate-900 ml-2">
                  {selectedLog.entityType} {selectedLog.entityId ? `#${selectedLog.entityId}` : ""}
                </strong>
              </div>

              <div>
                <span className="text-slate-400">Execution Outcome:</span>
                <span className="ml-2">{getOutcomeBadge(selectedLog.outcome)}</span>
              </div>

              {selectedLog.organization && (
                <div>
                  <span className="text-slate-400">Organization:</span>
                  <strong className="text-slate-900 ml-2">{selectedLog.organization}</strong>
                </div>
              )}

              {selectedLog.ipAddress && (
                <div>
                  <span className="text-slate-400">IP Address:</span>
                  <span className="text-slate-700 ml-2">{selectedLog.ipAddress}</span>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <span className="text-slate-400">User Agent:</span>
                  <span className="text-slate-700 ml-2 break-all">{selectedLog.userAgent}</span>
                </div>
              )}

              {selectedLog.requestId && (
                <div>
                  <span className="text-slate-400">Request Correlation ID:</span>
                  <span className="text-slate-700 ml-2">{selectedLog.requestId}</span>
                </div>
              )}
            </div>

            {/* Sanitized Metadata Display */}
            <div>
              <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5 font-sans">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Sanitized Event Metadata (Allowlisted Details):</span>
              </div>

              <div className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl border border-slate-800 overflow-x-auto text-[11px] leading-relaxed max-h-52">
                <pre>{JSON.stringify(selectedLog.metadata || {}, null, 2)}</pre>
              </div>

              <p className="text-[10px] text-slate-400 mt-1 font-sans">
                * Prohibited fields such as passwords, JWT tokens, biometrics, raw coordinates, and medical notes are stripped prior to storage.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
