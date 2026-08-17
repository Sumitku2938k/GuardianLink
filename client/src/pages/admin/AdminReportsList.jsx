import React, { useState } from "react";
import { FileText, Search, Filter, Eye, CheckCircle2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminReportsList() {
  const { adminReports } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = adminReports.filter(
    (r) =>
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.relatedCase.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Platform Reports Oversight</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee citizen found child reports, sighting tips, user inquiries, and system notifications.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Report ID (FR-2026-0044), Citizen Name, or Case #..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-medium"
          />
        </div>
      </div>

      {/* REPORTS TABLE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">Report ID</th>
              <th className="py-3.5 px-4 font-bold">Type</th>
              <th className="py-3.5 px-4 font-bold">Submitted By</th>
              <th className="py-3.5 px-4 font-bold">Related Case</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold">Created Date</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {filteredReports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                  {r.id}
                </td>

                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {r.type}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-900 font-semibold">
                  {r.submittedBy}
                </td>

                <td className="py-3.5 px-4 font-mono text-teal-700 font-bold">
                  {r.relatedCase}
                </td>

                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {r.status}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                  {r.createdDate}
                </td>

                <td className="py-3.5 px-4 text-right">
                  <Button
                    onClick={() => alert(`Reviewing Report ${r.id}`)}
                    variant="primary"
                    size="sm"
                    className="text-xs bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                    leftIcon={Eye}
                  >
                    Inspect Report
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
