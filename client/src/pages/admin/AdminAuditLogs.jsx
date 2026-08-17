import React, { useState } from "react";
import { History, Search, Filter, ShieldCheck, Eye, Lock } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminAuditLogs() {
  const { auditLogs } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedLog, setSelectedLog] = useState(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "All" || log.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

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
            Chronological cryptographic log of all administrative actions, role updates, and security events.
          </p>
        </div>
      </div>

      {/* IMMUTABLE LOG NOTICE */}
      <div className="p-3.5 rounded-xl bg-slate-100 border border-gray-200 text-slate-700 text-xs flex items-center gap-2 font-mono">
        <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>Audit logs are read-only, tamper-proof security records and cannot be deleted or overwritten.</span>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Actor Name, Action, Entity ID (ORG-NGO-01), or Audit ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Actor Roles</option>
            <option value="Admin">Admin</option>
            <option value="Police">Police</option>
            <option value="System">System</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">Audit Event ID</th>
              <th className="py-3.5 px-4 font-bold">Timestamp</th>
              <th className="py-3.5 px-4 font-bold">Actor & Role</th>
              <th className="py-3.5 px-4 font-bold">Administrative Action</th>
              <th className="py-3.5 px-4 font-bold">Entity & ID</th>
              <th className="py-3.5 px-4 font-bold">Result</th>
              <th className="py-3.5 px-4 font-bold text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 font-mono">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-bold text-indigo-700 text-[11px]">
                  {log.id}
                </td>

                <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                  {log.timestamp}
                </td>

                <td className="py-3.5 px-4">
                  <div className="font-sans font-bold text-slate-900">{log.actor}</div>
                  <span className="text-[10px] text-indigo-600 font-mono font-semibold">{log.role}</span>
                </td>

                <td className="py-3.5 px-4 font-sans text-slate-800 font-semibold">
                  {log.action}
                </td>

                <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                  {log.entity}: <strong className="text-slate-900">{log.entityId}</strong>
                </td>

                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {log.result}
                  </span>
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
      </div>

      {/* Audit Event Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Immutable Audit Event Details"
          subtitle={`Event ID: ${selectedLog.id}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
              <div><span className="text-slate-400">Timestamp:</span> <strong className="text-slate-900 ml-2">{selectedLog.timestamp}</strong></div>
              <div><span className="text-slate-400">Actor:</span> <strong className="text-indigo-700 ml-2">{selectedLog.actor} ({selectedLog.role})</strong></div>
              <div><span className="text-slate-400">Action:</span> <strong className="text-slate-900 ml-2">{selectedLog.action}</strong></div>
              <div><span className="text-slate-400">Target Entity:</span> <strong className="text-slate-900 ml-2">{selectedLog.entity} #{selectedLog.entityId}</strong></div>
              <div><span className="text-slate-400">Result Code:</span> <strong className="text-emerald-700 ml-2">{selectedLog.result}</strong></div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
