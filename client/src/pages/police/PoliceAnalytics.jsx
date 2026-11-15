import React from "react";
import { BarChart3, TrendingUp, Clock, MapPin, CheckCircle2, Shield, Users, FileText, AlertTriangle } from "lucide-react";
import { usePolice } from "@/context/PoliceContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { LocationDisplay } from "@/components/common/map/LocationDisplay";
import { Card } from "@/components/ui/Card";

export default function PoliceAnalytics() {
  const { stationAnalytics, policeCases, officers } = usePolice();

  const safeAnalytics = stationAnalytics || {};
  const safeCases = policeCases || [];
  const safeOfficers = officers || [];

  const activeCount = safeCases.filter((c) => c?.status !== "Closed" && c?.status !== "Cancelled").length;
  const criticalCount = safeCases.filter((c) => (c?.priority || "").toLowerCase() === "critical" && c?.status !== "Closed").length;
  const resolvedCount = safeCases.filter((c) => c?.status === "Closed" || c?.status === "Found" || c?.status === "Reunited").length;

  const hotspotMarkers = safeCases
    .filter(
      (c) =>
        c.latitude &&
        c.longitude &&
        Number.isFinite(Number(c.latitude)) &&
        Number.isFinite(Number(c.longitude))
    )
    .map((c) => ({
      id: `case-${c.id}`,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      type: "child",
      title: `${c.childName} (#${c.caseNumber})`,
      subtitle: `${c.status}`,
      address: c.lastSeenLocation
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400 shrink-0" />
            <span>Station Analytics & Performance Metrics</span>
          </h1>
          <p className="text-xs text-slate-400">Child safety recovery statistics, operational caseload & jurisdiction intelligence.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Missing Cases"
          value={safeAnalytics.totalMissing ?? safeCases.length}
          subtitle="Station Monitored"
          icon={BarChart3}
          colorScheme="blue"
        />

        <StatCard
          title="Recovery Rate"
          value={safeAnalytics.recoveryRate || "0.0%"}
          subtitle="Resolved / Total"
          icon={CheckCircle2}
          colorScheme="teal"
        />

        <StatCard
          title="Active Investigations"
          value={activeCount}
          subtitle={`${criticalCount} Critical Priority`}
          icon={AlertTriangle}
          colorScheme="rose"
        />

        <StatCard
          title="Station Officers"
          value={safeOfficers.length}
          subtitle="Active Duty Roster"
          icon={Users}
          colorScheme="teal"
        />
      </div>

      {/* Analytics Visualization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Caseload & Operational Breakdown</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Active Missing Child Inquiries:</span>
              <strong className="text-rose-400">{activeCount} cases</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Unassigned Cases Requiring Lead Officer:</span>
              <strong className="text-amber-300">{safeAnalytics.unassignedCases ?? 0} cases</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Pending FIR Document Legal Reviews:</span>
              <strong className="text-teal-300">{safeAnalytics.pendingFIRReviews ?? 0} files</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Verified Citizen Sightings:</span>
              <strong className="text-blue-400">{safeAnalytics.verifiedSightings ?? 0} leads</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Potential AI Matches Under Review:</span>
              <strong className="text-purple-400">{safeAnalytics.potentialMatches ?? 0} candidate leads</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Successfully Recovered & Reunited:</span>
              <strong className="text-emerald-400">{resolvedCount} children</strong>
            </div>
          </div>
        </Card>

        {/* Location Hotspot Map */}
        <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>Jurisdiction Incident & Sighting Map</span>
          </h3>
          <LocationDisplay
            markers={hotspotMarkers}
            height="320px"
            isPrivacyRedacted={hotspotMarkers.length === 0}
          />
        </Card>
      </div>
    </div>
  );
}
