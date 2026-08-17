import React, { useState } from "react";
import { BarChart3, TrendingUp, Clock, MapPin, ShieldCheck, Heart, Users, Activity } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminAnalytics() {
  const { platformStats } = useAdmin();
  const [timeRange, setTimeRange] = useState("30 Days");

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Platform Analytics & System Impact</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Macro-level recovery rate benchmarks, response times, organization efficiency, and geographical analytics.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm text-xs font-semibold">
          {["7 Days", "30 Days", "3 Months", "1 Year"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === range ? "bg-indigo-600 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* MACRO METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Recovery Rate"
          value="91.4%"
          subtitle="Target Benchmark 90%"
          icon={ShieldCheck}
          colorScheme="teal"
        />

        <StatCard
          title="Avg Initial Response"
          value="18 mins"
          subtitle="Report to Escort Dispatch"
          icon={Clock}
          colorScheme="blue"
        />

        <StatCard
          title="Avg Child Recovery Time"
          value="3.4 Days"
          subtitle="Case to Reunification"
          icon={TrendingUp}
          colorScheme="teal"
        />

        <StatCard
          title="AI Candidate Accuracy"
          value="94.2%"
          subtitle="Facial Match Precision"
          icon={Activity}
          colorScheme="blue"
        />
      </div>

      {/* RESPONSE TIME BREAKDOWN & STAGE DURATION */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-gray-150">
          Average Duration by Case Lifecycle Stage
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">1. Report Filing</span>
            <strong className="text-slate-900 font-bold text-sm block">4 mins</strong>
            <span className="text-[10px] text-slate-500 block">Citizen / Parent</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">2. Admin Review</span>
            <span className="text-slate-400 block font-bold">→</span>
            <strong className="text-slate-900 font-bold text-sm block">14 mins</strong>
            <span className="text-[10px] text-slate-500 block">Verification Desk</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">3. Police Station</span>
            <span className="text-slate-400 block font-bold">→</span>
            <strong className="text-indigo-700 font-bold text-sm block">1.2 hrs</strong>
            <span className="text-[10px] text-slate-500 block">Investigator Lead</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">4. AI Match & NGO</span>
            <span className="text-slate-400 block font-bold">→</span>
            <strong className="text-teal-700 font-bold text-sm block">2.1 Days</strong>
            <span className="text-[10px] text-slate-500 block">Shelter Care</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">5. Reunification</span>
            <span className="text-slate-400 block font-bold">→</span>
            <strong className="text-emerald-700 font-bold text-sm block">3.4 Days Total</strong>
            <span className="text-[10px] text-emerald-700 font-bold block">Recovered</span>
          </div>
        </div>
      </Card>

      {/* LOCATION DENSITY MAP PLACEHOLDER */}
      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Geographical Case Density & Sighting Heatmap</span>
            </h3>
            <p className="text-xs text-slate-500">Visual representation of active report locations across Metro Sectors.</p>
          </div>
        </div>

        <div className="h-64 rounded-2xl bg-slate-100 border border-gray-200 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <MapPin className="w-10 h-10 text-indigo-600 animate-bounce" />
          <strong className="text-slate-900 font-bold text-sm">Interactive GIS Density Map Engine</strong>
          <p className="text-xs text-slate-500 max-w-md">
            Showing 24 active missing case corridors, 18 found report locations, and 126 verified police/NGO shelters.
          </p>
        </div>
      </Card>
    </div>
  );
}
