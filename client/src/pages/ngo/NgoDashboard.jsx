import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  HeartHandshake,
  Building2,
  FileCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  Plus,
  ArrowLeftRight,
  HeartPulse,
  ChevronRight
} from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CapacityCard } from "@/components/ngo/CapacityCard";
import { UrgentCareAlertCard } from "@/components/ngo/UrgentCareAlertCard";
import { ChildCareCard } from "@/components/ngo/ChildCareCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NgoDashboard() {
  const navigate = useNavigate();
  const { currentNgo, shelterInfo, childrenInCare } = useNgo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wider">{currentNgo.name}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Shelter Kiosk Sector 12</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white tracking-tight">
            Good morning, Helping Hands Team
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Here's the current status of children, shelter capacity, and active care coordination.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/ngo/intake")}
            variant="primary"
            className="bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-955 font-bold text-xs hover:from-teal-300 hover:to-emerald-300"
            leftIcon={Plus}
          >
            Receive Child (Safe Intake)
          </Button>
        </div>
      </div>

      {/* PROMINENT SHELTER CAPACITY CARD */}
      <CapacityCard shelterInfo={shelterInfo} />

      {/* KEY CARE STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Children in Care"
          value={childrenInCare.length}
          subtitle="Receiving Temporary Shelter"
          icon={Heart}
          colorScheme="teal"
        />

        <StatCard
          title="Pending Intake"
          value={shelterInfo.pendingIntake}
          subtitle="Arriving Escorts"
          icon={Clock}
          colorScheme="amber"
        />

        <StatCard
          title="Awaiting Verification"
          value={childrenInCare.filter((c) => c.careStatus === "Awaiting Verification").length}
          subtitle="Police & Guardian Desk"
          icon={ShieldCheck}
          colorScheme="blue"
        />

        <StatCard
          title="Medical Attention Needed"
          value={childrenInCare.filter((c) => c.medicalStatus === "Medical Attention Required").length}
          subtitle="In Medical Ward"
          icon={HeartPulse}
          colorScheme="rose"
        />
      </div>

      {/* URGENT CARE ALERTS SECTION */}
      <UrgentCareAlertCard childrenInCare={childrenInCare} />

      {/* CHILDREN IN CARE PREVIEW & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Children Preview */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-teal-500 dark:text-teal-400 fill-current" />
                <span>Children Currently in Care</span>
              </h2>
              <p className="text-xs text-slate-550 dark:text-slate-400">Temporary shelter profiles and care logs.</p>
            </div>

            <Button
              onClick={() => navigate("/ngo/children")}
              variant="ghost"
              size="sm"
              rightIcon={ChevronRight}
              className="text-xs text-teal-600 dark:text-teal-400 font-bold"
            >
              View All ({childrenInCare.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {childrenInCare.slice(0, 2).map((child) => (
              <ChildCareCard key={child.id} child={child} />
            ))}
          </div>
        </div>

        {/* Right Column (4 Cols): Quick Actions */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-4 shadow-md">
            <h3 className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 pb-2">
              Quick Shelter Actions
            </h3>

            <div className="space-y-2.5">
              <Button
                onClick={() => navigate("/ngo/intake")}
                variant="primary"
                size="sm"
                className="w-full justify-start bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-955 font-bold text-xs"
                leftIcon={Plus}
              >
                Receive Child (Safe Intake)
              </Button>

              <Button
                onClick={() => navigate("/ngo/children")}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-gray-200 dark:border-slate-805 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                leftIcon={Heart}
              >
                View Children in Care
              </Button>

              <Button
                onClick={() => navigate("/ngo/shelter")}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-gray-200 dark:border-slate-805 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                leftIcon={Building2}
              >
                Manage Shelter Capacity
              </Button>

              <Button
                onClick={() => navigate("/ngo/transfers")}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs border-gray-200 dark:border-slate-805 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                leftIcon={ArrowLeftRight}
              >
                Initiate Shelter Transfer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
