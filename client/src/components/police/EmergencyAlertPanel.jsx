import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, AlertTriangle, ArrowRight, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const EmergencyAlertPanel = ({ criticalCases }) => {
  if (!criticalCases || criticalCases.length === 0) return null;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-600/60 p-5 sm:p-6 shadow-2xl text-white space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-900/60 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center ring-4 ring-red-600/30 animate-pulse shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {criticalCases.length} Critical Case{criticalCases.length > 1 ? "s" : ""} Require Immediate Attention
            </h3>
            <span className="text-xs text-red-300 font-semibold">
              Emergency high-priority dispatch active across CCTV and patrol networks.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {criticalCases.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-slate-900/90 border border-red-500/40 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <img
                src={c.childPhoto}
                alt={c.childName}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-red-500/40 shrink-0"
              />
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-300">{c.caseNumber}</span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">
                    CRITICAL
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{c.childName}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-400" /> {c.lastSeenLocation}</span>
                  <span>•</span>
                  <span>{c.updatedAt}</span>
                </div>
              </div>
            </div>

            <Link to={`/police/cases/${c.id}`}>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                rightIcon={ArrowRight}
              >
                Review Case
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};
