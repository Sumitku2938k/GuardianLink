import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { CitizenReportCard } from "@/components/citizen/CitizenReportCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function CitizenReportsList() {
  const navigate = useNavigate();
  const {
    foundReports,
    stats,
    isLoadingSightings,
    sightingsError,
    loadCitizenSightings,
    startFoundWorkflow
  } = useCitizen();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadCitizenSightings();
  }, [loadCitizenSightings]);

  const filteredReports = foundReports.filter((r) => {
    const matchesSearch =
      (r.reportNumber && r.reportNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.location && r.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.city && r.city.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === "Under Review") {
      matchesStatus = ["under_review", "pending", "investigating", "under review"].includes(
        (r.status || "").toLowerCase()
      );
    } else if (statusFilter === "Verified") {
      matchesStatus = ["verified", "matched", "match found"].includes(
        (r.status || "").toLowerCase()
      );
    } else if (statusFilter === "Resolved") {
      matchesStatus = ["resolved", "closed", "dismissed"].includes(
        (r.status || "").toLowerCase()
      );
    }

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
          <p className="text-xs text-gray-500">
            Authoritative sighting logs, status history, and official law enforcement desk updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={loadCitizenSightings}
            variant="outline"
            size="sm"
            isLoading={isLoadingSightings}
            leftIcon={RefreshCw}
            className="text-xs"
          >
            Refresh
          </Button>

          <Button
            onClick={handleStartFound}
            variant="primary"
            leftIcon={Plus}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none"
          >
            Report Found Child
          </Button>
        </div>
      </div>

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Reports"
          value={isLoadingSightings ? "..." : stats.totalSubmitted}
          subtitle="Submitted Sightings"
          icon={FileText}
          colorScheme="blue"
        />

        <StatCard
          title="Under Review"
          value={isLoadingSightings ? "..." : stats.underReview}
          subtitle="Police & NGO Queue"
          icon={Clock}
          colorScheme="amber"
        />

        <StatCard
          title="Verified"
          value={isLoadingSightings ? "..." : stats.verified}
          subtitle="Confirmed Case Leads"
          icon={ShieldCheck}
          colorScheme="teal"
        />

        <StatCard
          title="Resolved"
          value={isLoadingSightings ? "..." : stats.resolved}
          subtitle="Safely Reunited"
          icon={CheckCircle2}
          colorScheme="rose"
        />
      </div>

      {/* Error alert if load failed */}
      {sightingsError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Failed to sync sighting records: {sightingsError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadCitizenSightings} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Report #, address, or city..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border border-transparent focus:border-teal-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {["All", "Under Review", "Verified", "Resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm font-bold"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {isLoadingSightings && foundReports.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Loading sighting records...
          </p>
          <p className="text-xs text-gray-400 mt-1">Retrieving official records from database.</p>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <CitizenReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : foundReports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Reports Filed Yet"
          description="No sighting reports filed yet. If you observe an unaccompanied child, submit a sighting report to notify official responders."
          actionLabel="Report Found Child"
          onAction={handleStartFound}
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No Matching Reports Found"
          description="No sighting reports match your active search query or filter."
          actionLabel="Clear Filter"
          onAction={() => {
            setSearchQuery("");
            setStatusFilter("All");
          }}
        />
      )}
    </div>
  );
}
