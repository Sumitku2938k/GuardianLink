import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, Cpu, FileText } from "lucide-react";
import { useMissingCases } from "@/context/MissingCasesContext";
import { ActiveCaseBanner } from "@/components/missing/ActiveCaseBanner";
import { CaseFilters } from "@/components/missing/CaseFilters";
import { MissingCaseCard } from "@/components/missing/MissingCaseCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function MissingCasesList() {
  const navigate = useNavigate();
  const { missingCases, potentialMatches } = useMissingCases();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Created");

  // Simulated Loading & Error State
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const activeEmergencyCase = missingCases.find(
    (c) => c.status === "Active" || c.status === "Investigating" || c.status === "Potential Match" || c.status === "Under Review"
  );

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  // Filter & Sort logic
  const filteredCases = missingCases
    .filter((item) => {
      const matchesSearch =
        item.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || item.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === "All" || item.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === "Oldest Case") {
        return a.id.localeCompare(b.id);
      }
      if (sortBy === "Highest Priority") {
        const priorityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
      }
      // "Recently Created" / "Recently Updated"
      return b.id.localeCompare(a.id);
    });

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Unable to load missing cases</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
          A network connection timeout occurred while fetching emergency records.
        </p>
        <Button onClick={handleRetry} variant="primary" size="sm" className="mt-5" leftIcon={RefreshCw}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
            <span>Missing Cases</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Monitor and manage missing-child reports associated with your account.
          </p>
        </div>

        <Link to="/parent/missing-cases/new" className="w-full sm:w-auto">
          <Button variant="destructive" className="w-full justify-center shadow-lg shadow-rose-600/30" leftIcon={Plus}>
            Report a Missing Child
          </Button>
        </Link>
      </div>

      {/* Active Emergency Banner */}
      {!isLoading && activeEmergencyCase && (
        <ActiveCaseBanner activeCase={activeEmergencyCase} />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Active Cases"
          value={missingCases.filter((c) => c.status !== "Closed" && c.status !== "Recovered").length}
          subtitle="Monitored Live"
          icon={AlertTriangle}
          colorScheme="rose"
        />

        <StatCard
          title="Under Investigation"
          value={missingCases.filter((c) => c.status === "Investigating" || c.status === "Under Review").length}
          subtitle="Police Squad Dispatched"
          icon={FileText}
          colorScheme="blue"
        />

        <StatCard
          title="Potential Matches"
          value={potentialMatches.length}
          subtitle="AI Vector Flags"
          icon={Cpu}
          colorScheme="amber"
        />

        <StatCard
          title="Recovered"
          value={missingCases.filter((c) => c.status === "Recovered" || c.status === "Closed").length}
          subtitle="Safe Reunifications"
          icon={CheckCircle2}
          colorScheme="teal"
        />
      </div>

      {/* Toolbar Filters */}
      <CaseFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Case List Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 animate-pulse h-32" />
          ))}
        </div>
      ) : filteredCases.length > 0 ? (
        <div className="space-y-4">
          {filteredCases.map((item) => (
            <MissingCaseCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No Missing Cases"
          description="Your registered children currently have no active missing-child reports."
          actionLabel="Register / Manage Children"
          onAction={() => navigate("/parent/children")}
        />
      )}
    </div>
  );
}
