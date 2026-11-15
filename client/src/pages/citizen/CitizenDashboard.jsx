import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartHandshake,
  ShieldCheck,
  FileText,
  Bell,
  Clock,
  CheckCircle2,
  ChevronRight,
  Search,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { FoundChildCTA } from "@/components/citizen/FoundChildCTA";
import { CitizenReportCard } from "@/components/citizen/CitizenReportCard";
import { NearbyHelpCard } from "@/components/citizen/NearbyHelpCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const {
    foundReports,
    stats,
    isLoadingSightings,
    sightingsError,
    loadCitizenSightings,
    startFoundWorkflow
  } = useCitizen();

  useEffect(() => {
    loadCitizenSightings();
  }, [loadCitizenSightings]);

  const handleStartFound = () => {
    startFoundWorkflow();
    navigate("/citizen/found-child");
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20">
          <HeartHandshake className="w-4 h-4" />
          <span>Citizen Helper Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Help a Child Find Their Way Home
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
          If you have observed an unaccompanied minor or child in need of care, GuardianLink connects your observation with official law enforcement and child welfare responders.
        </p>
      </div>

      {/* PRIMARY ACTION CTA */}
      <FoundChildCTA onClick={handleStartFound} />

      {/* Real Dynamic Statistics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Your Sighting Activity
          </h2>
          {isLoadingSightings && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin text-teal-500" /> Updating live...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Submitted"
            value={isLoadingSightings ? "..." : stats.totalSubmitted}
            subtitle="Verified database records"
            icon={FileText}
            colorScheme="blue"
          />

          <StatCard
            title="Under Review"
            value={isLoadingSightings ? "..." : stats.underReview}
            subtitle="Active responder evaluation"
            icon={Clock}
            colorScheme="amber"
          />

          <StatCard
            title="Verified"
            value={isLoadingSightings ? "..." : stats.verified}
            subtitle="Confirmed case leads"
            icon={ShieldCheck}
            colorScheme="teal"
          />

          <StatCard
            title="Resolved"
            value={isLoadingSightings ? "..." : stats.resolved}
            subtitle="Closed or safely reunited"
            icon={CheckCircle2}
            colorScheme="rose"
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card
          onClick={() => navigate("/citizen/search")}
          className="p-4 text-center hover:border-teal-500/40 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white block">
            Photo Search
          </span>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">AI Facial Match</span>
        </Card>

        <Card
          onClick={handleStartFound}
          className="p-4 text-center hover:border-teal-500/40 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white block">
            Report Sighting
          </span>
          <span className="text-[10px] text-gray-400">Official Queue</span>
        </Card>

        <Card
          onClick={() => navigate("/citizen/reports")}
          className="p-4 text-center hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white block">
            My Reports ({foundReports.length})
          </span>
          <span className="text-[10px] text-gray-400">Track Status</span>
        </Card>

        <Card
          onClick={() => navigate("/citizen/notifications")}
          className="p-4 text-center hover:border-indigo-500/40 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white block">
            Notifications
          </span>
          <span className="text-[10px] text-gray-400">Responder Alerts</span>
        </Card>

        <Card
          onClick={() => navigate("/citizen/profile")}
          className="p-4 text-center hover:border-amber-500/40 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white block">
            Helper Profile
          </span>
          <span className="text-[10px] text-gray-400">Citizen Account</span>
        </Card>
      </div>

      {/* Sighting Error Banner (if fetch failed) */}
      {sightingsError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Failed to sync recent reports: {sightingsError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadCitizenSightings}
            leftIcon={RefreshCw}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Safety Guidance Card */}
      <Card className="p-6 space-y-3 bg-slate-900 text-white border-slate-800">
        <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5" />
          <span>While Helping a Child (Citizen Safety Protocol)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
          <div>• <strong>Stay Calm & Reassuring:</strong> Speak in a gentle, non-threatening tone.</div>
          <div>• <strong>Crowded, Public Place:</strong> Remain in visible public locations (metro booth, police kiosk, security post).</div>
          <div>• <strong>Never Detain or Confront:</strong> Do not physically detain or question the child under duress.</div>
          <div>• <strong>No Social Media Posting:</strong> Avoid publishing pictures publicly; use official GuardianLink channels.</div>
        </div>
      </Card>

      {/* Recent Submitted Reports */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Submitted Reports</h2>
            <p className="text-xs text-gray-500">Track active sightings and police desk updates in real time.</p>
          </div>
          <Button
            onClick={() => navigate("/citizen/reports")}
            variant="ghost"
            size="sm"
            rightIcon={ChevronRight}
            className="text-xs text-primary font-bold"
          >
            View All ({foundReports.length})
          </Button>
        </div>

        <div className="space-y-3">
          {isLoadingSightings && foundReports.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading submitted sighting records from database...</p>
            </div>
          ) : foundReports.length > 0 ? (
            foundReports.slice(0, 3).map((report) => (
              <CitizenReportCard key={report.id} report={report} />
            ))
          ) : (
            <div className="p-8 text-center text-xs text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
              <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">No Sighting Reports Filed Yet</p>
              <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                You have not submitted any sightings yet. Use &ldquo;Report Sighting&rdquo; if you observe an unaccompanied minor to notify authorized responders.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Registered Assistance Facilities & Helplines */}
      <NearbyHelpCard />
    </div>
  );
}
