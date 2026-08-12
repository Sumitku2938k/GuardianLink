import React from "react";
import { Check } from "lucide-react";

export const CaseStatusTracker = ({ currentStageIndex = 1 }) => {
  const stages = [
    { index: 1, label: "Report Submitted" },
    { index: 2, label: "Under Review" },
    { index: 3, label: "Police Assigned" },
    { index: 4, label: "Investigation Active" },
    { index: 5, label: "Potential Match" },
    { index: 6, label: "Child Found" },
    { index: 7, label: "Identity Verified" },
    { index: 8, label: "Reunited" },
    { index: 9, label: "Case Closed" }
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Case Status Pipeline Tracker
        </h3>
        <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
          Stage {currentStageIndex} of 9
        </span>
      </div>

      {/* Desktop Horizontal Tracker */}
      <div className="hidden lg:block relative py-4">
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-4 h-1 bg-gradient-to-r from-rose-500 via-teal-400 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${((currentStageIndex - 1) / (stages.length - 1)) * 95}%` }}
        />

        <div className="flex justify-between items-center relative z-10">
          {stages.map((st) => {
            const isCompleted = currentStageIndex > st.index;
            const isCurrent = currentStageIndex === st.index;

            return (
              <div key={st.index} className="flex flex-col items-center group cursor-default">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : isCurrent
                      ? "bg-rose-600 text-white ring-4 ring-rose-500/20 shadow-lg scale-110"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-400 border border-gray-200 dark:border-slate-700"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.index}
                </div>

                <span
                  className={`text-[10px] font-semibold mt-2 text-center max-w-[70px] leading-tight ${
                    isCurrent
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : isCompleted
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400"
                  }`}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Tracker */}
      <div className="lg:hidden space-y-3 pt-2">
        {stages.map((st) => {
          const isCompleted = currentStageIndex > st.index;
          const isCurrent = currentStageIndex === st.index;

          return (
            <div key={st.index} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-rose-600 text-white ring-4 ring-rose-500/20"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-400 border border-gray-200 dark:border-slate-700"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : st.index}
              </div>

              <span
                className={`text-xs font-semibold ${
                  isCurrent
                    ? "text-rose-600 dark:text-rose-400 font-bold"
                    : isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400"
                }`}
              >
                {st.label} {isCurrent && "(Current Phase)"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
