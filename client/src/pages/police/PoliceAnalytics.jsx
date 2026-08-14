import React from "react";
import { BarChart3, TrendingUp, Clock, MapPin, CheckCircle2, Shield } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { Card } from "@/components/ui/Card";

export default function PoliceAnalytics() {
  const { stationAnalytics } = usePolice();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400 shrink-0" />
            <span>Station Analytics & Performance Metrics</span>
          </h1>
          <p className="text-xs text-slate-400">Child safety recovery statistics, response time benchmarks & hotspot analysis.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Missing Cases"
          value={stationAnalytics.totalMissing}
          subtitle="Annual Station Log"
          icon={BarChart3}
          colorScheme="blue"
        />

        <StatCard
          title="Recovery Rate"
          value={stationAnalytics.recoveryRate}
          subtitle="Benchmark Target 90%"
          icon={CheckCircle2}
          colorScheme="teal"
        />

        <StatCard
          title="Avg Response Time"
          value={stationAnalytics.avgResponseTime}
          subtitle="Report to Dispatch"
          icon={Clock}
          colorScheme="amber"
        />

        <StatCard
          title="Avg Recovery Duration"
          value={stationAnalytics.avgRecoveryTime}
          subtitle="Report to Handover"
          icon={TrendingUp}
          colorScheme="teal"
        />
      </div>

      {/* Analytics Visualization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Response & Dispatch Timeline Breakdown
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Report Submission → Police Desk Review:</span>
              <strong className="text-teal-300">1.2 mins</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Desk Review → Officer Squad Assignment:</span>
              <strong className="text-teal-300">3.0 mins</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">AI Vector Lookup → Potential Match Flag:</span>
              <strong className="text-blue-400">2.5 mins</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Human Officer Verification → Family Handover:</span>
              <strong className="text-emerald-400">2.8 hours</strong>
            </div>
          </div>
        </Card>

        {/* Location Hotspot Map Placeholder */}
        <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>Missing Case Sighting Hotspots (Sector 12 Zone)</span>
          </h3>
          <MapPlaceholder
            locationName="Sector 12 & Central Metro Sighting Hotspots"
            latitude="28.6139"
            longitude="77.2090"
          />
        </Card>
      </div>
    </div>
  );
}
