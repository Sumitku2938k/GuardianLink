import React from "react";
import { BarChart3, Heart, CheckCircle2, Clock, Building2 } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";

export default function NgoAnalytics() {
  const { ngoAnalytics } = useNgo();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-855 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-500 dark:text-teal-400 shrink-0" />
            <span>NGO Care Analytics & Impact Metrics</span>
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400">Children assisted, average time in care, and family reunification benchmarks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Children Assisted"
          value={ngoAnalytics.childrenAssisted}
          subtitle="Total Shelter Intake"
          icon={Heart}
          colorScheme="teal"
        />

        <StatCard
          title="Reunification Rate"
          value={ngoAnalytics.reunificationRate}
          subtitle="Target 85%"
          icon={CheckCircle2}
          colorScheme="teal"
        />

        <StatCard
          title="Avg Time in Care"
          value={ngoAnalytics.avgTimeInCare}
          subtitle="Intake to Handover"
          icon={Clock}
          colorScheme="blue"
        />

        <StatCard
          title="Medical Cases"
          value={ngoAnalytics.medicalCasesCount}
          subtitle="Specialized Care"
          icon={Heart}
          colorScheme="amber"
        />
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-4 shadow-md">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Care Pipeline Performance
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
            <span className="text-slate-500 dark:text-slate-400">Average Intake & Assessment Duration:</span>
            <strong className="text-teal-605 dark:text-teal-300">25 minutes</strong>
          </div>
          <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
            <span className="text-slate-500 dark:text-slate-400">Average Time for Police & Guardian Match:</span>
            <strong className="text-teal-605 dark:text-teal-300">1.8 days</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-505 dark:text-slate-400">Successful Safe Reunification Handover:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">88.5%</strong>
          </div>
        </div>
      </Card>
    </div>
  );
}
