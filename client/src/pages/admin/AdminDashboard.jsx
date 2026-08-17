import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Heart,
  FolderOpen,
  FileText,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    platformStats,
    criticalAlerts,
    activityFeed,
    adminCases,
    users,
    aiMetrics
  } = useAdmin();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">
              System Command Center
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">Last updated: {platformStats.lastUpdate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            GuardianLink Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor platform activity, manage users and organizations, and oversee child-safety operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/admin/audit-logs")}
            variant="outline"
            size="sm"
            leftIcon={Activity}
          >
            Audit History
          </Button>
          <Button
            onClick={() => navigate("/admin/users")}
            variant="primary"
            size="sm"
            className="bg-indigo-600 text-white font-bold hover:bg-indigo-700"
            leftIcon={Users}
          >
            User Management
          </Button>
        </div>
      </div>

      {/* PLATFORM STATISTICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={platformStats.totalUsers.toLocaleString()}
          subtitle="Parents, Citizens, Police, NGOs"
          icon={Users}
          colorScheme="blue"
        />

        <StatCard
          title="Registered Children"
          value={platformStats.registeredChildren.toLocaleString()}
          subtitle="Digital Profiles Protected"
          icon={Heart}
          colorScheme="teal"
        />

        <StatCard
          title="Active Missing Cases"
          value={platformStats.activeMissingCases}
          subtitle="Under Active Investigation"
          icon={FolderOpen}
          colorScheme="rose"
        />

        <StatCard
          title="Recovered Children"
          value={platformStats.recoveredChildren.toLocaleString()}
          subtitle="Safely Reunification Handover"
          icon={ShieldCheck}
          colorScheme="teal"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-mono font-bold block">
            Active Found Reports
          </span>
          <strong className="text-xl font-black text-slate-900 block mt-1">
            {platformStats.activeFoundReports}
          </strong>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-mono font-bold block">
            Verified Organizations
          </span>
          <strong className="text-xl font-black text-slate-900 block mt-1">
            {platformStats.verifiedOrganizations}
          </strong>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-mono font-bold block">
            Pending Verifications
          </span>
          <strong className="text-xl font-black text-amber-600 block mt-1">
            {platformStats.pendingVerifications}
          </strong>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-slate-500 text-[10px] uppercase font-mono font-bold block">
            System Alerts
          </span>
          <strong className="text-xl font-black text-rose-600 block mt-1">
            {platformStats.systemAlertsCount}
          </strong>
        </div>
      </div>

      {/* CRITICAL ADMINISTRATIVE ALERTS */}
      {criticalAlerts.length > 0 && (
        <Card className="p-5 bg-white border-gray-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-150 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Critical Administrative Alerts ({criticalAlerts.length})
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Requires Admin Attention</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        alert.severity === "Critical"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {alert.severity} Severity
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{alert.time}</span>
                  </div>
                  <strong className="text-slate-900 font-bold block text-sm pt-1">{alert.title}</strong>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{alert.description}</p>
                </div>

                <Button
                  onClick={() => {
                    if (alert.module === "Organizations") navigate("/admin/organizations");
                    else if (alert.module === "Cases") navigate("/admin/cases");
                    else navigate("/admin/ai-monitoring");
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  rightIcon={ArrowRight}
                >
                  {alert.action}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PLATFORM ACTIVITY FEED & SYSTEM HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Activity Feed */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 bg-white border-gray-200 text-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>Real-Time Platform Activity Stream</span>
                </h3>
                <p className="text-xs text-slate-500">Live operational events across Parent, Citizen, Police, and NGO modules.</p>
              </div>

              <Button
                onClick={() => navigate("/admin/audit-logs")}
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-600 font-bold"
                rightIcon={ArrowRight}
              >
                View Full Audit Logs
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-gray-150 flex items-center justify-between gap-4 hover:border-indigo-200 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold">{item.actor}</strong>
                      <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px]">{item.action}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">{item.time}</span>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shrink-0">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (4 Cols): Compact System Health */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 bg-white border-gray-200 text-slate-800 space-y-4 shadow-sm">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-gray-150 pb-2">
              System Infrastructure Health
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 flex justify-between items-center">
                <div>
                  <strong className="text-slate-900 block font-bold">API Services</strong>
                  <span className="text-[10px] text-slate-400 font-mono">REST Gateway</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Operational</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 flex justify-between items-center">
                <div>
                  <strong className="text-slate-900 block font-bold">Database Cluster</strong>
                  <span className="text-[10px] text-slate-400 font-mono">Replica Set</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Operational</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 flex justify-between items-center">
                <div>
                  <strong className="text-slate-900 block font-bold">AI Facial Engine</strong>
                  <span className="text-[10px] text-slate-400 font-mono">Match Queue ({aiMetrics.processingQueue})</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Operational</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 flex justify-between items-center">
                <div>
                  <strong className="text-slate-900 block font-bold">Notification Gateway</strong>
                  <span className="text-[10px] text-slate-400 font-mono">Push & SMS</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Operational</span>
              </div>
            </div>

            <Button
              onClick={() => navigate("/admin/ai-monitoring")}
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold text-indigo-700 border-indigo-200"
              leftIcon={Cpu}
            >
              Monitor AI Engine
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
