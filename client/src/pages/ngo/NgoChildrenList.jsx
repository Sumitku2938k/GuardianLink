import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Plus, Search, Table, LayoutGrid, Filter, Eye } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { ChildCareTable } from "@/components/ngo/ChildCareTable";
import { ChildCareCard } from "@/components/ngo/ChildCareCard";
import { Button } from "@/components/ui/Button";

export default function NgoChildrenList() {
  const navigate = useNavigate();
  const { childrenInCare } = useNgo();

  const [viewMode, setViewMode] = useState("table"); // 'table' | 'card'
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Received");

  const filteredChildren = childrenInCare.filter((c) => {
    const matchesSearch =
      c.childReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.intakeId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || c.careStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-teal-650 dark:text-teal-400 fill-current shrink-0" />
            <span>Children in Care</span>
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Manage children currently receiving temporary support through your organization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "table" ? "bg-teal-500 text-slate-955 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Table className="w-4 h-4" /> Table View
            </button>

            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "card" ? "bg-teal-500 text-slate-955 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Card View
            </button>
          </div>

          <Button
            onClick={() => navigate("/ngo/intake")}
            variant="primary"
            className="bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-955 font-bold text-xs"
            leftIcon={Plus}
          >
            Receive Child
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Child Reference, Case ID (MC-2026-8821), or Intake ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-white rounded-xl border border-gray-200 dark:border-slate-800 focus:border-teal-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="All" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">All Care Statuses</option>
            <option value="Newly Received" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Newly Received</option>
            <option value="Under Assessment" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Under Assessment</option>
            <option value="Stable" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Stable</option>
            <option value="Medical Attention" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Medical Attention</option>
            <option value="Awaiting Verification" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Awaiting Verification</option>
            <option value="Released" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Released</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
          >
            <option value="Recently Received" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Sort by: Recently Received</option>
            <option value="Longest in Care" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Longest in Care</option>
            <option value="Highest Priority" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Highest Priority</option>
          </select>
        </div>
      </div>

      {/* Main Content View */}
      {viewMode === "table" ? (
        <ChildCareTable childrenList={filteredChildren} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChildren.map((child) => (
            <ChildCareCard key={child.id} child={child} />
          ))}
        </div>
      )}
    </div>
  );
}
