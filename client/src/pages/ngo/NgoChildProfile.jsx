import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  HeartPulse,
  FileText,
  Clock,
  UserCheck,
  ShieldCheck,
  Plus,
  ArrowLeft,
  Building2,
  HeartHandshake,
  Lock,
  Download
} from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CareStatusBadge } from "@/components/ngo/CareStatusBadge";
import { MedicalStatusBadge } from "@/components/ngo/MedicalStatusBadge";
import { CareUpdateFormModal } from "@/components/ngo/CareUpdateFormModal";
import { HandoverConfirmationModal } from "@/components/ngo/HandoverConfirmationModal";
import { ChildTimeline } from "@/components/children/ChildTimeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NgoChildProfile() {
  const { childId } = useParams();
  const navigate = useNavigate();

  const { getChildById, careLogs, recordCareUpdate, confirmHandover } = useNgo();
  const child = getChildById(childId);

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'care' | 'medical' | 'documents' | 'timeline' | 'coordination'
  const [isCareModalOpen, setIsCareModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  if (!child) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Child Care Profile Not Found</h3>
        <Button onClick={() => navigate("/ngo/children")} className="mt-4">
          Return to Children in Care
        </Button>
      </div>
    );
  }

  const logs = careLogs[child.id] || [];

  return (
    <div className="space-y-6">
      {/* CARE PROFILE HEADER */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={child.photo}
            alt={child.childReference}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg shrink-0"
          />

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-teal-300 bg-slate-50 dark:bg-slate-950 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-slate-800">
                Intake #{child.intakeId}
              </span>
              <CareStatusBadge status={child.careStatus} />
              <MedicalStatusBadge status={child.medicalStatus} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">{child.childReference}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Approx {child.approxAge} yrs • {child.gender}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" /> {child.timeInShelter}</span>
              <span>•</span>
              <span className="font-mono text-teal-650 dark:text-teal-300 font-bold">Case #{child.caseNumber}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
          <Button
            onClick={() => setIsCareModalOpen(true)}
            variant="primary"
            size="sm"
            className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 text-xs"
            leftIcon={Plus}
          >
            Record Daily Care Update
          </Button>

          {child.careStatus === "Awaiting Verification" || child.careStatus === "Reunification Pending" ? (
            <Button
              onClick={() => setIsHandoverModalOpen(true)}
              variant="primary"
              size="sm"
              className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs"
              leftIcon={HeartHandshake}
            >
              Reunification Handover
            </Button>
          ) : null}
        </div>
      </div>

      {/* PROFILE NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 overflow-x-auto pb-2 text-xs">
        {["overview", "care", "medical", "documents", "timeline", "coordination"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all text-[11px] ${
              activeTab === tab
                ? "bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/20 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-805 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* DYNAMIC TAB CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-4 shadow-md">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-gray-100 dark:border-slate-800">
                Current Shelter Care Summary
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div><span className="text-slate-500 dark:text-slate-400 block">Assigned Dormitory:</span> <strong className="text-slate-850 dark:text-white mt-0.5 block">{child.assignedDorm}</strong></div>
                <div><span className="text-slate-500 dark:text-slate-400 block">Emotional State:</span> <strong className="text-teal-600 dark:text-teal-300 mt-0.5 block">{child.emotionalState}</strong></div>
                <div><span className="text-slate-500 dark:text-slate-400 block">Intake Source:</span> <strong className="text-slate-850 dark:text-white mt-0.5 block">{child.intakeSource}</strong></div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-950 border border-gray-150 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-mono text-teal-650 dark:text-teal-400 uppercase font-bold">Staff Care Notes</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                  "{child.careNotes}"
                </p>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-3 shadow-md">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase block pb-2 border-b border-gray-100 dark:border-slate-800">
                Guardian & Police Coordination
              </span>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-955 rounded-xl border border-gray-150 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Guardian Verification</span>
                  <strong className="text-teal-600 dark:text-teal-300 font-bold block mt-0.5">{child.guardianVerificationStatus}</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-955 rounded-xl border border-gray-150 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Police Lead</span>
                  <strong className="text-slate-850 dark:text-white block mt-0.5">{child.assignedOfficer} ({child.policeStation})</strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "care" && (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daily Wellbeing & Care Updates ({logs.length})
            </h3>
            <Button size="sm" onClick={() => setIsCareModalOpen(true)} className="bg-teal-500 text-slate-950 font-bold text-xs">
              + Add Care Update
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            {logs.map((log) => (
              <div key={log.id} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-955 border border-gray-150 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <strong className="text-teal-650 dark:text-teal-300 font-bold">{log.category}</strong>
                  <span className="font-mono">{log.time}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-mono">{log.text}</p>
                <span className="text-[10px] text-slate-500 block">Recorded by: {log.staff}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Care Update Form Modal */}
      <CareUpdateFormModal
        isOpen={isCareModalOpen}
        onClose={() => setIsCareModalOpen(false)}
        child={child}
        onSaveCareUpdate={(cId, payload) => recordCareUpdate(cId, payload)}
      />

      {/* Handover Confirmation Modal */}
      <HandoverConfirmationModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        child={child}
        onConfirmHandover={(cId, details) => confirmHandover(cId, details)}
      />
    </div>
  );
}
