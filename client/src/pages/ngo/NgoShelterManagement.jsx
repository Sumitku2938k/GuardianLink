import React from "react";
import { Building2, CheckCircle2, Users, Heart } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CapacityCard } from "@/components/ngo/CapacityCard";
import { Card } from "@/components/ui/Card";

export default function NgoShelterManagement() {
  const { shelterInfo } = useNgo();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-850 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-500 dark:text-teal-400 shrink-0" />
            <span>Shelter Capacity & Facilities Management</span>
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400">Monitor bed occupancy, shelter facilities, and active care staff.</p>
        </div>
      </div>

      <CapacityCard shelterInfo={shelterInfo} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-855 dark:text-white space-y-4 shadow-md">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Shelter Facilities Status
          </h3>
          <div className="space-y-3 text-xs">
            {shelterInfo.facilities.map((f, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-955 rounded-xl border border-gray-150 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-850 dark:text-white">{f.name}</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 text-slate-855 dark:text-white space-y-4 shadow-md">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Care Staff Roster
          </h3>
          <div className="p-4 bg-gray-50 dark:bg-slate-955 rounded-2xl border border-gray-150 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between items-center text-teal-650 dark:text-teal-300 font-bold">
              <span>Active Staff On Duty</span>
              <span>{shelterInfo.staffCount} Staff Members</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Including pediatric nurses, child counselors, shelter supervisors, and nutrition coordinators.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
