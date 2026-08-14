import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Cpu,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Building2,
  BarChart2
} from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { EmergencyAlertPanel } from "@/components/police/EmergencyAlertPanel";
import { PoliceCaseTable } from "@/components/police/PoliceCaseTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PoliceDashboard() {
  const navigate = useNavigate();
  const { policeCases, potentialMatches, foundReports, stationAnalytics, currentOfficer, currentStation } = usePolice();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const criticalCases = policeCases.filter((c) => c.priority === "Critical" && c.status !== "Closed");

  const filteredCases = policeCases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastSeenLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === "All" || c.priority.toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">{currentStation}</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-mono">{currentOfficer.shift}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Good afternoon, {currentOfficer.name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational child-safety case management & live emergency dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/police/cases")}
            variant="primary"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Manage Active Cases ({policeCases.length})
          </Button>
        </div>
      </div>

      {/* EMERGENCY ALERT PANEL */}
      <EmergencyAlertPanel criticalCases={criticalCases} />

      {/* KEY OPERATIONAL STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Missing Cases"
          value={policeCases.filter((c) => c.status !== "Closed").length}
          subtitle="Station Monitored"
          icon={AlertTriangle}
          colorScheme="rose"
        />

        <StatCard
          title="Critical Cases"
          value={criticalCases.length}
          subtitle="Immediate Action"
          icon={ShieldAlert}
          colorScheme="rose"
        />

        <StatCard
          title="Potential AI Matches"
          value={potentialMatches.length}
          subtitle="Awaiting Verification"
          icon={Cpu}
          colorScheme="amber"
        />

        <StatCard
          title="Found Child Reports"
          value={foundReports.length}
          subtitle="Citizen Queue"
          icon={FileText}
          colorScheme="blue"
        />
      </div>

      {/* PRIORITY & STATUS DISTRIBUTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center justify-between">
            <span>Case Priority Breakdown</span>
            <BarChart2 className="w-4 h-4 text-blue-400" />
          </h4>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-rose-400">Critical Priority</span>
                <span>{policeCases.filter((c) => c.priority === "Critical").length} cases</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-red-600 rounded-full" style={{ width: "35%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-rose-400">High Priority</span>
                <span>{policeCases.filter((c) => c.priority === "High").length} cases</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: "45%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-amber-400">Medium Priority</span>
                <span>{policeCases.filter((c) => c.priority === "Medium").length} cases</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "20%" }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center justify-between">
            <span>Station Efficiency & Resolution</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Recovery Rate</span>
              <strong className="text-teal-300 text-xl font-black block mt-0.5">{stationAnalytics.recoveryRate}</strong>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Avg Response Time</span>
              <strong className="text-blue-400 text-xl font-black block mt-0.5">{stationAnalytics.avgResponseTime}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* FILTER TOOLBAR & ACTIVE CASES TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active cases by ID, Child Name, or Location..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 text-white rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Investigating">Investigating</option>
              <option value="Under Review">Under Review</option>
              <option value="Closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
          </div>
        </div>

        {/* HIGH-DENSITY OPERATIONAL DATA TABLE */}
        <PoliceCaseTable cases={filteredCases} />
      </div>
    </div>
  );
}
