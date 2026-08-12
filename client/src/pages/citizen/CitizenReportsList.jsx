import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Filter, Plus, ShieldCheck, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { CitizenReportCard } from "@/components/citizen/CitizenReportCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function CitizenReportsList() {
  const navigate = useNavigate();
  const { foundReports, startFoundWorkflow } = useCitizen();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredReports = foundReports.filter((r) => {
    const matchesSearch =
      r.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || r.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleStartFound = () => {
    startFoundWorkflow();
    navigate("/citizen/found-child");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-500 shrink-0" />
            <span>My Submitted Reports</span>
          </h1>
          <p className="text-xs text-gray-500">Track sighting logs, AI matches, and police desk review updates.</p>
        </div>

        <Button
          onClick={handleStartFound}
          variant="primary"
          leftIcon={Plus}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none"
        >
          Report Found Child
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reports"
          value={foundReports.length}
          subtitle="Submitted Sightings"
          icon={FileText}
          colorScheme="blue"
        />

        <StatCard
          title="Match Found"
          value={foundReports.filter((r) => r.status === "Match Found").length}
          subtitle="Verified AI Vector Flags"
          icon={ShieldCheck}
          colorScheme="teal"
        />

        <StatCard
          title="Under Review"
          value={foundReports.filter((r) => r.status === "Under Review").length}
          subtitle="Police & NGO Queue"
          icon={Clock}
          colorScheme="amber"
        />

        <StatCard
          title="Resolved"
          value={foundReports.filter((r) => r.status === "Resolved").length}
          subtitle="Handed Over Safely"
          icon={CheckCircle2}
          colorScheme="teal"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Report # or Location..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border border-transparent focus:border-teal-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {["All", "Match Found", "Under Review", "Resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length > 0 ? (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <CitizenReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No Reports Found"
          description="No sighting reports match your active search query."
          actionLabel="Report Found Child"
          onAction={handleStartFound}
        />
      )}
    </div>
  );
}
