import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Plus,
  AlertTriangle,
  Users,
  CheckCircle2,
  Bell,
  Clock,
  Search,
  Settings,
  HelpCircle,
  PhoneCall,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Heart,
  Eye,
  FileText,
  UserCheck,
} from "lucide-react";

// Context
import { useAuth } from "@/context/AuthContext";
import { useChildren } from "@/context/ChildrenContext";
import { useMissingCases } from "@/context/MissingCasesContext";

// Components
import { StatCard } from "@/components/dashboard/StatCard";
import { ChildCard } from "@/components/dashboard/ChildCard";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { NotificationWidget } from "@/components/dashboard/NotificationWidget";
import { SafetyTipsWidget } from "@/components/dashboard/SafetyTipsWidget";

// Modals
import { RegisterChildModal } from "@/components/dashboard/RegisterChildModal";
import { ReportMissingModal } from "@/components/dashboard/ReportMissingModal";
import { ChildDetailModal } from "@/components/dashboard/ChildDetailModal";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Dashboard({ defaultTab }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Tab state derived from URL query parameters, defaultTab prop, or fallback
  const activeTab = searchParams.get("tab") || defaultTab || "dashboard";

  // Consume Centralized State
  const { children: childrenList, addChild: handleRegisterSuccess } = useChildren();
  const { missingCases } = useMissingCases();

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isReportMissingOpen, setIsReportMissingOpen] = useState(false);
  const [isChildDetailOpen, setIsChildDetailOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);

  const openViewProfile = (child) => {
    navigate(`/parent/children/${child.id}`);
  };

  const openReportEmergency = (child) => {
    navigate(`/parent/missing-cases/new${child?.id ? `?childId=${child.id}` : ""}`);
  };

  const handleTabChange = (tabId) => {
    if (tabId === "dashboard") {
      navigate("/dashboard");
    } else if (tabId === "children") {
      navigate("/parent/children");
    } else if (tabId === "missing") {
      navigate("/parent/missing-cases");
    } else {
      navigate(`/dashboard?tab=${tabId}`);
    }
  };

  const activeCases = missingCases.filter(
    (c) => c.status !== "Closed" && c.status !== "Recovered" && c.status !== "Cancelled"
  );
  const activeCasesCount = activeCases.length;
  const resolvedCasesCount = missingCases.filter(
    (c) => c.status === "Closed" || c.status === "Recovered"
  ).length;

  // Derive dynamic activities from real data
  const dynamicActivities = [];
  missingCases.forEach((c) => {
    dynamicActivities.push({
      id: `case-${c.id}`,
      title: `Missing Report: ${c.childName}`,
      desc: `Case #${c.caseNumber} registered at ${c.lastSeenLocation}. Status: ${c.status}.`,
      time: c.createdAt || "Recent",
      icon: AlertTriangle,
      status: c.status === "Active" ? "active" : "completed",
    });
  });
  childrenList.forEach((child) => {
    dynamicActivities.push({
      id: `child-${child.id}`,
      title: "Child Profile Registered",
      desc: `${child.name} enrolled in GuardianLink family protection system.`,
      time: child.createdAt ? new Date(child.createdAt).toLocaleDateString() : "Active",
      icon: CheckCircle2,
      status: "completed",
    });
  });

  // Derive dynamic notifications from real data
  const dynamicNotifications = [];
  activeCases.forEach((c) => {
    dynamicNotifications.push({
      id: `notif-case-${c.id}`,
      category: "alert",
      title: "Active Missing Alert",
      message: `Emergency case #${c.caseNumber} for ${c.childName} is currently active.`,
      time: c.createdAt || "Recent",
      isRead: false,
    });
  });
  childrenList.forEach((child) => {
    if (child.photoUrl && !child.photoUrl.includes("placeholder")) {
      dynamicNotifications.push({
        id: `notif-photo-${child.id}`,
        category: "system",
        title: "Photo Record Enrolled",
        message: `Biometric photo on file for ${child.name}.`,
        time: child.updatedAt || "Recent",
        isRead: true,
      });
    }
  });

  return (
    <div className="space-y-8">
      {/* TAB 1: MAIN DASHBOARD VIEW */}
      {activeTab === "dashboard" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Welcome Banner Card */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-primary to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-slate-800">
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-300 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-teal-300" />
                  <span>AI Protective Shield Enabled</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  Welcome back, {user?.fullName || user?.name || "Guardian"}!
                </h1>
                <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
                  Protecting your family starts here. {childrenList.length} children registered.{" "}
                  {activeCasesCount === 0
                    ? "Zero active emergency alerts across your network."
                    : `${activeCasesCount} emergency alert(s) currently active.`}
                </p>
              </div>

              {/* Quick Action Banner Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <Button
                  onClick={() => navigate("/parent/children/add")}
                  variant="glass"
                  size="md"
                  leftIcon={Plus}
                  className="flex-1 sm:flex-initial"
                >
                  Register Child
                </Button>

                <Button
                  onClick={() => navigate("/parent/missing-cases/new")}
                  variant="destructive"
                  size="md"
                  leftIcon={AlertTriangle}
                  className="flex-1 sm:flex-initial shadow-lg shadow-rose-600/30"
                >
                  Report Missing Child
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Registered Children"
              value={childrenList.length}
              subtitle="Active Safety Profiles"
              icon={Users}
              trend="up"
              trendValue={childrenList.length > 0 ? `${childrenList.length} Enrolled` : "None"}
              colorScheme="blue"
            />

            <StatCard
              title="Active Missing Cases"
              value={activeCasesCount}
              subtitle={activeCasesCount === 0 ? "System Safe & Clean" : "Incident Active"}
              icon={ShieldCheck}
              trend="up"
              trendValue={activeCasesCount === 0 ? "100% Safe" : `${activeCasesCount} Active`}
              colorScheme="teal"
            />

            <StatCard
              title="Resolved Cases"
              value={resolvedCasesCount}
              subtitle="Safe Family Closures"
              icon={CheckCircle2}
              trend="up"
              trendValue={resolvedCasesCount > 0 ? `${resolvedCasesCount} Closed` : "0"}
              colorScheme="amber"
            />

            <StatCard
              title="Notifications"
              value={dynamicNotifications.length}
              subtitle="Safety Log Updates"
              icon={Bell}
              colorScheme="rose"
            />
          </div>

          {/* Grid: Children Preview & Activity Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* My Children Preview Section (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span>My Children</span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Monitored profile cards and rapid status checks
                  </p>
                </div>

                <Button
                  onClick={() => navigate("/parent/children")}
                  variant="ghost"
                  size="sm"
                  rightIcon={ChevronRight}
                >
                  View All ({childrenList.length})
                </Button>
              </div>

              {/* Children Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {childrenList.length === 0 ? (
                  <div className="sm:col-span-2 p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">No child profiles registered yet</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      Register your child's profile to enable AI safety monitoring and emergency response.
                    </p>
                    <Button
                      onClick={() => navigate("/parent/children/add")}
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      leftIcon={Plus}
                    >
                      Register Child Profile
                    </Button>
                  </div>
                ) : (
                  childrenList.slice(0, 2).map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      onViewProfile={openViewProfile}
                      onReportMissing={openReportEmergency}
                    />
                  ))
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="pt-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                  Quick Emergency & Management Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card
                    onClick={() => navigate("/parent/children/add")}
                    className="p-4 text-center hover:border-primary/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Register Child
                    </span>
                    <span className="text-[10px] text-gray-400">Add profile</span>
                  </Card>

                  <Card
                    onClick={() => navigate("/parent/missing-cases/new")}
                    className="p-4 text-center hover:border-rose-500/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Report Missing
                    </span>
                    <span className="text-[10px] text-gray-400">Emergency Red</span>
                  </Card>

                  <Card
                    onClick={() => handleTabChange("help")}
                    className="p-4 text-center hover:border-teal-500/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Helpline 1098
                    </span>
                    <span className="text-[10px] text-gray-400">Direct Connect</span>
                  </Card>

                  <Card
                    onClick={() => handleTabChange("notifications")}
                    className="p-4 text-center hover:border-indigo-500/40 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Bell className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block">
                      Alert Log
                    </span>
                    <span className="text-[10px] text-gray-400">View feeds</span>
                  </Card>
                </div>
              </div>
            </div>

            {/* Right Column Widgets (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Activity Timeline Card */}
              <ActivityTimeline activities={dynamicActivities} />

              {/* Safety Tips Widget */}
              <SafetyTipsWidget />
            </div>
          </div>

          {/* Notification Widget full section */}
          <div className="pt-4">
            <NotificationWidget notifications={dynamicNotifications} />
          </div>
        </motion.div>
      )}

      {/* TAB 3: MISSING CASES */}
      {activeTab === "missing" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <span>Missing Cases & Live Alert Feed</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nationwide active emergency alerts synced with AI camera networks
              </p>
            </div>

            <Button
              onClick={() => openReportEmergency()}
              variant="destructive"
              leftIcon={AlertTriangle}
            >
              File Missing Report
            </Button>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-8 h-8 shrink-0 text-emerald-500" />
            <div>
              <h4 className="font-bold text-sm">All Your Registered Children Are Safe</h4>
              <p className="text-xs opacity-90 mt-0.5">
                No active missing alerts flagged for your family profiles. AI facial recognition is actively scanning public CCTV streams.
              </p>
            </div>
          </div>

          <EmptyState
            icon={CheckCircle2}
            title="Zero Active Family Missing Cases"
            description="Your family child profiles are 100% verified and protected in our system."
            actionLabel="Report An Emergency"
            onAction={() => openReportEmergency()}
          />
        </motion.div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications & Alert Center
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Full history of system notifications and safety warnings
            </p>
          </div>

          <NotificationWidget notifications={dynamicNotifications} />
        </motion.div>
      )}

      {/* TAB 5: TIMELINE */}
      {activeTab === "timeline" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-3xl"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Audit Log & History Timeline
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Chronological record of all updates, check-ins, and verified face matches
            </p>
          </div>

          <ActivityTimeline activities={dynamicActivities} />
        </motion.div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === "settings" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-3xl"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Account & Safety Settings
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure alerts, biometric encryption, and family permissions
            </p>
          </div>

          <Card className="p-6 space-y-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white border-b pb-3 border-gray-100 dark:border-slate-800">
              Emergency Alert Preferences
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-950 dark:text-white block">
                    SMS & WhatsApp Instant Emergency Alerts
                  </span>
                  <span className="text-gray-500">
                    Receive instant SMS if child leaves designated safe zone
                  </span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-955 dark:text-white block">
                    Nearby Citizen Network Dispatch
                  </span>
                  <span className="text-gray-500">
                    Allow verified citizens within 5km radius to receive sighting alerts
                  </span>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <Button variant="primary" size="sm">
                Save Preferences
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* TAB 7: HELP & SUPPORT */}
      {activeTab === "help" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-4xl"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Help & Emergency Assistance
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              24/7 National Childline & GuardianLink Support Hotline
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="p-6 bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white">
              <PhoneCall className="w-10 h-10 text-teal-300 mb-4" />
              <h3 className="text-lg font-black text-white">National Childline 1098</h3>
              <p className="text-xs text-slate-300 mt-1 mb-4">
                Toll-free 24x7 emergency phone service for children in need of care and protection.
              </p>
              <a
                href="tel:1098"
                className="inline-block px-4 py-2 bg-teal-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-300 transition-colors"
              >
                Call 1098 Now
              </a>
            </Card>

            <Card className="p-6">
              <Shield className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Police Helpline 112 / 100</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Direct connection to police control room for emergency kidnapping or missing child dispatches.
              </p>
              <a
                href="tel:112"
                className="inline-block px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors"
              >
                Call Police 112
              </a>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Modal Dialogs */}
      <RegisterChildModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
      />

      <ReportMissingModal
        isOpen={isReportMissingOpen}
        onClose={() => setIsReportMissingOpen(false)}
        selectedChild={selectedChild}
      />

      <ChildDetailModal
        isOpen={isChildDetailOpen}
        onClose={() => setIsChildDetailOpen(false)}
        child={selectedChild}
        onReportMissing={openReportEmergency}
      />
    </div>
  );
}
