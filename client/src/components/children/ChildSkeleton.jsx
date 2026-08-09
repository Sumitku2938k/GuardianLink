import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export const ChildSkeleton = () => {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm p-5 space-y-4">
      {/* Header Visual */}
      <Skeleton className="h-28 w-full rounded-xl" />
      
      {/* Body details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>

      {/* Button */}
      <Skeleton className="h-10 w-full rounded-xl mt-2" />
    </div>
  );
};

export const HeaderStatsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
};
