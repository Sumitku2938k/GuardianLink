import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Table, LayoutGrid, Map, Search, Filter, Eye, MapPin } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { PoliceCaseTable } from "@/components/police/PoliceCaseTable";
import { CaseStatusBadge } from "@/components/missing/CaseStatusBadge";
import { CasePriorityBadge } from "@/components/missing/CasePriorityBadge";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { Button } from "@/components/ui/Button";

export default function PoliceCasesList() {
  const navigate = useNavigate();
  const { policeCases } = usePolice();

  const [viewMode, setViewMode] = useState("table"); // 'table' | 'card' | 'map'
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const filteredCases = policeCases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === "All" || c.priority.toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
            <span>Active Cases Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor and manage child-safety cases assigned to your police post.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "table" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Table className="w-4 h-4" /> Table View
          </button>

          <button
            onClick={() => setViewMode("card")}
            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "card" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Card View
          </button>

          <button
            onClick={() => setViewMode("map")}
            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "map" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Map className="w-4 h-4" /> Map View
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Case ID, Child Name, or Area..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Investigating">Investigating</option>
            <option value="Under Review">Under Review</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
        </div>
      </div>

      {/* Main Content Area Based on View Mode */}
      {viewMode === "table" && <PoliceCaseTable cases={filteredCases} />}

      {viewMode === "card" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((c) => (
            <div key={c.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <img src={c.childPhoto} alt={c.childName} className="w-14 h-14 rounded-xl object-cover ring-2 ring-slate-700" />
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-bold text-sm">{c.childName}</strong>
                    <span className="text-teal-400 font-mono text-[10px] font-bold">{c.caseNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CaseStatusBadge status={c.status} />
                    <CasePriorityBadge priority={c.priority} />
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">Last Seen: <strong>{c.lastSeenLocation}</strong></span>
                </div>
                <span className="text-[10px] text-slate-400 block">Assigned Officer: {c.assignedOfficerName}</span>
              </div>

              <Button
                onClick={() => navigate(`/police/cases/${c.id}`)}
                variant="primary"
                size="sm"
                className="w-full justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                leftIcon={Eye}
              >
                Open Case Dossier
              </Button>
            </div>
          ))}
        </div>
      )}

      {viewMode === "map" && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-teal-300 font-bold flex items-center justify-between">
            <span>🗺️ Map View Mode Simulation Active</span>
            <span className="text-slate-400 font-normal">Displaying {filteredCases.length} pin markers</span>
          </div>

          <MapPlaceholder
            locationName="Sector 12 / Sector 18 Police Patrol Zone Map UI"
            latitude="28.6139"
            longitude="77.2090"
          />
        </div>
      )}
    </div>
  );
}
