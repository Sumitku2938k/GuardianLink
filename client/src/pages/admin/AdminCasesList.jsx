import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Search, Filter, ShieldCheck, Eye, AlertTriangle } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminCasesList() {
  const navigate = useNavigate();
  const { adminCases } = useAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const filteredCases = adminCases.filter((c) => {
    const matchesSearch =
      c.childReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.policeStation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === "All" || c.priority.toLowerCase() === priorityFilter.toLowerCase();
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Platform-Wide Case Oversight</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor active missing child cases, investigation milestones, police assignments, and NGO shelter involvements.
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Case ID (MC-2026-8821), Child Name, or Police Station..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 text-slate-900 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High Priority</option>
            <option value="Normal">Normal</option>
          </select>
        </div>
      </div>

      {/* CASES TABLE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="py-3.5 px-4 font-bold">Child Reference</th>
              <th className="py-3.5 px-4 font-bold">Case #</th>
              <th className="py-3.5 px-4 font-bold">Priority</th>
              <th className="py-3.5 px-4 font-bold">Status</th>
              <th className="py-3.5 px-4 font-bold">Assigned Police</th>
              <th className="py-3.5 px-4 font-bold">NGO Care</th>
              <th className="py-3.5 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {filteredCases.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <img src={c.photo} alt={c.childReference} className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-200" />
                    <div>
                      <strong className="text-slate-900 block font-bold text-xs">{c.childReference}</strong>
                      <span className="text-[10px] text-slate-400">Approx {c.approxAge} yrs</span>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                  {c.id}
                </td>

                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      c.priority === "Critical"
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {c.priority}
                  </span>
                </td>

                <td className="py-3.5 px-4 font-bold text-slate-800">
                  {c.status}
                </td>

                <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                  {c.policeStation}
                </td>

                <td className="py-3.5 px-4 text-teal-700 font-semibold text-[11px]">
                  {c.ngoInvolved}
                </td>

                <td className="py-3.5 px-4 text-right">
                  <Button
                    onClick={() => navigate(`/admin/cases/${c.id}`)}
                    variant="primary"
                    size="sm"
                    className="text-xs bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                    leftIcon={Eye}
                  >
                    View Oversight
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
