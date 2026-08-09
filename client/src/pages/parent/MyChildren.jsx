import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, RefreshCw, AlertCircle, Archive, CheckCircle2 } from "lucide-react";
import { useChildren } from "@/context/ChildrenContext";
import { ChildCard } from "@/components/children/ChildCard";
import { ChildFilters } from "@/components/children/ChildFilters";
import { ChildSkeleton, HeaderStatsSkeleton } from "@/components/children/ChildSkeleton";
import { ConfirmModal } from "@/components/children/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function MyChildren() {
  const navigate = useNavigate();
  const { children, archiveChild } = useChildren();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Added");

  // Mock Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Archive Modal State
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const triggerArchiveFlow = (child) => {
    setArchiveTarget(child);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = () => {
    if (archiveTarget) {
      archiveChild(archiveTarget.id);
      setArchiveTarget(null);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Filter & Sort Logic
  const filteredChildren = children
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastLocation.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === "All" || c.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "Name A-Z") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "Name Z-A") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "Recently Updated") {
        // Just mock evaluation since updatedAt contains relative text
        return b.id.localeCompare(a.id);
      }
      // "Recently Added" (Default)
      return b.id.localeCompare(a.id);
    });

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Failed to load children profiles</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
          A network connection issue was detected. Please check your signal and try again.
        </p>
        <Button onClick={handleRetry} variant="primary" size="sm" className="mt-5" leftIcon={RefreshCw}>
          Retry Connection
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
            <Users className="w-6 h-6 text-primary shrink-0" />
            <span>My Children</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your children's profiles, safety information, and emergency details.
          </p>
        </div>

        <Link to="/parent/children/add" className="w-full sm:w-auto">
          <Button variant="primary" className="w-full justify-center" leftIcon={Plus}>
            Register Child
          </Button>
        </Link>
      </div>

      {/* Stats Skeleton or Statistics */}
      {isLoading ? (
        <HeaderStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Total Enrolled</span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{children.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Status Safe</span>
              <h3 className="text-2xl font-black text-emerald-500 mt-1">
                {children.filter((c) => c.status === "Safe").length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Status Found</span>
              <h3 className="text-2xl font-black text-amber-500 mt-1">
                {children.filter((c) => c.status === "Found").length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">AI Verified</span>
              <h3 className="text-2xl font-black text-indigo-500 mt-1">100%</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar / Search & Filter Section */}
      <ChildFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Content Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <ChildSkeleton key={n} />
          ))}
        </div>
      ) : filteredChildren.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChildren.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onArchive={triggerArchiveFlow}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No children registered yet"
          description="Register your child's profile to enable GuardianLink's safety and emergency features."
          actionLabel="Register Your Child"
          onAction={() => navigate("/parent/children/add")}
        />
      )}

      {/* Archive Confirmation Modal */}
      <ConfirmModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Child Profile"
        message={`Are you sure you want to archive ${archiveTarget?.name}'s profile? You will temporarily lose AI monitoring coordinates for this record.`}
        confirmLabel="Archive Profile"
        confirmVariant="destructive"
        requireInput={true}
        requireInputValue={archiveTarget?.name || "CONFIRM"}
        inputPlaceholder="Type child name to confirm"
      />
    </div>
  );
}
