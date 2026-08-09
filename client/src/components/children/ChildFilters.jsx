import React from "react";
import { Search, Filter, SortAsc } from "lucide-react";

export const ChildFilters = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
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
          placeholder="Search children by name, school, or location..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl border border-transparent focus:border-primary dark:focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
        />
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {["All", "Safe", "Missing", "Found", "Recovered"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === status
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 gap-1.5">
          <SortAsc className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent outline-none cursor-pointer pr-1"
          >
            <option value="Recently Added">Recently Added</option>
            <option value="Name A-Z">Name A-Z</option>
            <option value="Name Z-A">Name Z-A</option>
            <option value="Recently Updated">Recently Updated</option>
          </select>
        </div>
      </div>
    </div>
  );
};
