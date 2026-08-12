import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartHandshake,
  ShieldCheck,
  FileText,
  Bell,
  Building2,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Lock,
  Heart
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
  const { foundReports, startFoundWorkflow } = useCitizen();

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
          If you've found a child who appears lost or separated from their family, GuardianLink can help you report and connect them with the right support.
        </p>
      </div>

      {/* PRIMARY ACTION CTA */}
      <FoundChildCTA onClick={handleStartFound} />

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          onClick={handleStartFound}
          className="p-4 text-center hover:border-teal-500/40 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white block">
            Report Found Child
          </span>
          <span className="text-[10px] text-gray-400">Start 60s Flow</span>
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
          <span className="text-[10px] text-gray-400">Match Alerts</span>
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
          <span className="text-[10px] text-gray-400">Verified Citizen</span>
        </Card>
      </div>

      {/* Safety Guidance Card */}
      <Card className="p-6 space-y-3 bg-slate-900 text-white border-slate-800">
        <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5" />
          <span>While Helping a Child (Safety Guidance)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
          <div>• <strong>Stay Calm:</strong> Keep your voice reassuring and soft.</div>
          <div>• <strong>Safe Public Place:</strong> Stay in crowded, well-lit areas (kiosks, libraries, station posts).</div>
          <div>• <strong>No Force:</strong> Do not force or distress the child for details.</div>
          <div>• <strong>No Public Photos:</strong> Avoid posting photos on open social media.</div>
        </div>
      </Card>

      {/* Recent Reports List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Submitted Reports</h2>
            <p className="text-xs text-gray-500">Track active sightings and police desk updates.</p>
          </div>
          <Button onClick={() => navigate("/citizen/reports")} variant="ghost" size="sm" rightIcon={ChevronRight} className="text-xs text-primary font-bold">
            View All ({foundReports.length})
          </Button>
        </div>

        <div className="space-y-3">
          {foundReports.slice(0, 2).map((report) => (
            <CitizenReportCard key={report.id} report={report} />
          ))}
        </div>
      </div>

      {/* Nearby Responders */}
      <NearbyHelpCard />
    </div>
  );
}
