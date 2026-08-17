import React from "react";
import { Building2, Users, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const CapacityCard = ({ shelterInfo }) => {
  const occupancyPercentage = Math.round((shelterInfo.occupied / shelterInfo.totalCapacity) * 100);
  const isCapacityHigh = occupancyPercentage >= 85;

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-4 shadow-md">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Shelter Capacity Overview</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Helping Hands Kiosk - Sector 12</span>
          </div>
        </div>

        <Badge variant={isCapacityHigh ? "warning" : "success"} size="sm" className="font-bold">
          {occupancyPercentage}% Occupied ({shelterInfo.available} Spaces Open)
        </Badge>
      </div>

      {/* Visual Capacity Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span>Occupancy Progress: {shelterInfo.occupied} / {shelterInfo.totalCapacity} Beds</span>
          <span>{shelterInfo.available} Available</span>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCapacityHigh ? "bg-amber-500" : "bg-gradient-to-r from-teal-400 to-emerald-400"
            }`}
            style={{ width: `${occupancyPercentage}%` }}
          />
        </div>
      </div>

      {/* Capacity Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
        <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Total Capacity</span>
          <strong className="text-slate-850 dark:text-white text-lg font-black block mt-0.5">{shelterInfo.totalCapacity}</strong>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Children in Care</span>
          <strong className="text-teal-600 dark:text-teal-300 text-lg font-black block mt-0.5">{shelterInfo.occupied}</strong>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Available Spaces</span>
          <strong className="text-emerald-600 dark:text-emerald-400 text-lg font-black block mt-0.5">{shelterInfo.available}</strong>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Pending Intake</span>
          <strong className="text-amber-600 dark:text-amber-400 text-lg font-black block mt-0.5">{shelterInfo.pendingIntake}</strong>
        </div>
      </div>

      {/* Warning Banner if High Occupancy */}
      {isCapacityHigh && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-650 dark:text-amber-300 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <span>Capacity Warning: Shelter is approaching max capacity (Only {shelterInfo.available} spaces remaining).</span>
        </div>
      )}
    </Card>
  );
};
