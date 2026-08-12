import React from "react";
import { Search, Filter, SortAsc } from "lucide-react";

export const CaseFilters = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  sortBy,
  setSortBy
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by child name or Case # (e.g. MC-2026-8821)..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl border border-transparent focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
        />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto custom-scrollbar max-w-full">
          {["All", "Active", "Under Review", "Investigating", "Potential Match", "Found", "Recovered", "Closed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-transparent outline-none cursor-pointer pr-1"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Sort Option */}
        <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 gap-1.5">
          <SortAsc className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent outline-none cursor-pointer pr-1"
          >
            <option value="Recently Created">Recently Created</option>
            <option value="Recently Updated">Recently Updated</option>
            <option value="Highest Priority">Highest Priority</option>
            <option value="Oldest Case">Oldest Case</option>
          </select>
        </div>
      </div>
    </div>
  );
};
