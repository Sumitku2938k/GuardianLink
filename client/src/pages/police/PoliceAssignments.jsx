import React, { useState, useMemo } from "react";
import { Users, UserPlus, ShieldCheck, CheckCircle2, Search, Filter, ShieldAlert } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { OfficerWorkloadCard } from "@/components/police/OfficerWorkloadCard";
import { AssignmentModal } from "@/components/police/AssignmentModal";
import { Button } from "@/components/ui/Button";

export default function PoliceAssignments() {
  const { officers, policeCases, assignOfficer, isLoading } = usePolice();
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const unassignedCases = useMemo(() => {
    return (policeCases || []).filter(
      (c) =>
        c?.status !== "Closed" &&
        c?.status !== "Cancelled" &&
        (!c?.assignedOfficerId && (!c?.assignedOfficer || !c?.assignedOfficer.id))
    );
  }, [policeCases]);

  const activeAssignableCases = useMemo(() => {
    return (policeCases || []).filter(
      (c) => c?.status !== "Closed" && c?.status !== "Cancelled"
    );
  }, [policeCases]);

  const currentSelectedCase = useMemo(() => {
    if (selectedCaseId) {
      return activeAssignableCases.find((c) => c.id === selectedCaseId || c.caseNumber === selectedCaseId);
    }
    return unassignedCases[0] || activeAssignableCases[0] || null;
  }, [selectedCaseId, unassignedCases, activeAssignableCases]);

  const handleReassignClick = (officer) => {
    setIsModalOpen(true);
  };

  const filteredOfficers = useMemo(() => {
    return (officers || []).filter((off) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (off.name || "").toLowerCase().includes(q) ||
        (off.badgeNumber || "").toLowerCase().includes(q) ||
        (off.rank || "").toLowerCase().includes(q) ||
        (off.station || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active Duty" && (off.availability === "Active Duty" || off.status === "Active Duty")) ||
        (statusFilter === "Unavailable" && (off.availability !== "Active Duty" && off.status !== "Active Duty"));

      return matchesSearch && matchesStatus;
    });
  }, [officers, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400 shrink-0" />
            <span>Officer Workload & Squad Roster</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time station case distribution, squad assignment and active duty officer metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unassignedCases.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300 font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{unassignedCases.length} Unassigned Case{unassignedCases.length > 1 ? "s" : ""}</span>
            </div>
          )}
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            leftIcon={UserPlus}
            className="bg-blue-600 hover:bg-blue-500 text-xs font-bold"
            isDisabled={activeAssignableCases.length === 0}
          >
            Assign Case Load
          </Button>
        </div>
      </div>

      {/* Target Case Selector Bar & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search officers by name or badge..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 shrink-0 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All">All Officers</option>
            <option value="Active Duty">Active Duty</option>
            <option value="Unavailable">Unavailable / On Leave</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 shrink-0 uppercase">Assign Case:</span>
          <select
            value={selectedCaseId || (currentSelectedCase?.id || "")}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            {activeAssignableCases.length === 0 ? (
              <option value="">No Active Cases</option>
            ) : (
              activeAssignableCases.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.caseNumber} - {c.childName} ({c.priority})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Roster Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="w-32 h-4 bg-slate-800 rounded" />
                  <div className="w-24 h-3 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-12 bg-slate-950 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredOfficers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Officers Found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery
              ? `No officers match the search query "${searchQuery}".`
              : "No approved officers currently registered in this station roster."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOfficers.map((off) => (
            <OfficerWorkloadCard
              key={off.id}
              officer={off}
              onReassignClick={handleReassignClick}
            />
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCase={currentSelectedCase}
        onAssignConfirm={(cId, oId) => assignOfficer(cId, oId)}
      />
    </div>
  );
}
