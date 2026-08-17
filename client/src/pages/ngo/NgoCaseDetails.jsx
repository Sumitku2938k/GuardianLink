import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HeartHandshake, ShieldCheck, ArrowLeft, Lock, Heart, CheckCircle2 } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CareStatusBadge } from "@/components/ngo/CareStatusBadge";
import { HandoverConfirmationModal } from "@/components/ngo/HandoverConfirmationModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NgoCaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const { getChildById, confirmHandover } = useNgo();
  const child = getChildById(caseId);

  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  if (!child) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-slate-805 dark:text-white">NGO Case Record Not Found</h3>
        <Button onClick={() => navigate("/ngo/cases")} className="mt-4">
          Return to Cases
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={child.photo} alt={child.childReference} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-teal-650 dark:text-teal-300 font-bold">Case #{child.caseNumber}</span>
              <CareStatusBadge status={child.careStatus} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">{child.childReference}</h1>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">Assigned Officer: {child.assignedOfficer} ({child.policeStation})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsHandoverModalOpen(true)}
            variant="primary"
            className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs"
            leftIcon={HeartHandshake}
          >
            Reunification Handover
          </Button>
        </div>
      </div>

      {/* Role Boundaries Disclaimer Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-305 flex items-start gap-3 shadow-sm">
        <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Role Scope Notice:</strong> NGO shelter staff manage child care, wellbeing logs, and handover preparation. Legal identity verification, FIR modifications, and official case closures are managed strictly by assigned police authorities.
        </p>
      </div>

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
