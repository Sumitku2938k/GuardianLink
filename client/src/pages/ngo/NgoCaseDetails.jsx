import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HeartHandshake, ShieldCheck, ArrowLeft, Lock, Heart, CheckCircle2, Building2 } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { CareStatusBadge } from "@/components/ngo/CareStatusBadge";
import { HandoverConfirmationModal } from "@/components/ngo/HandoverConfirmationModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import * as ngoService from "@/services/ngoService";
import api from "@/lib/axios";

export default function NgoCaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const { getChildById, confirmHandover } = useNgo();
  const contextChild = getChildById(caseId);
  const [directChild, setDirectChild] = useState(null);
  const [isLoading, setIsLoading] = useState(!contextChild);

  useEffect(() => {
    if (!contextChild && caseId) {
      setIsLoading(true);
      // Try to find matching care record or case
      ngoService
        .getNgoCareRecords()
        .then((res) => {
          if (res?.careRecords) {
            const found = res.careRecords.find(
              (r) =>
                r._id === caseId ||
                r.caseId?._id === caseId ||
                r.caseId?.caseNumber === caseId ||
                r.caseNumber === caseId
            );
            if (found) {
              setDirectChild(ngoService.normalizeCareRecord(found));
            }
          }
        })
        .catch((err) => console.error("Error fetching case details:", err))
        .finally(() => setIsLoading(false));
    }
  }, [contextChild, caseId]);

  const child = contextChild || directChild;
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-sm font-mono text-slate-500">Loading case details...</h3>
      </div>
    );
  }

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
              <span className="text-xs font-mono font-bold text-teal-650 dark:text-teal-300">Case #{child.caseNumber}</span>
              <CareStatusBadge status={child.careStatus} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">{child.childReference}</h1>
            <span className="text-xs text-slate-550 dark:text-slate-400 block font-mono">Assigned Officer: {child.assignedOfficer} ({child.policeStation})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsHandoverModalOpen(true)}
            variant="primary"
            className="bg-emerald-500 text-slate-955 font-bold hover:bg-emerald-455 text-xs"
            leftIcon={HeartHandshake}
          >
            Reunification Handover
          </Button>
        </div>
      </div>

      {/* Role Boundaries Disclaimer Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3 shadow-sm">
        <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Role Scope Notice:</strong> NGO shelter staff manage child care, wellbeing logs, and handover preparation. Legal identity verification, FIR modifications, and official case closures are managed strictly by assigned police authorities.
        </p>
      </div>

      {/* Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-3 shadow-md">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Care Record Summary
          </h3>
          <div className="space-y-2 text-xs">
            <div><span className="text-slate-500">Intake ID:</span> <strong className="ml-2 font-mono">{child.intakeId}</strong></div>
            <div><span className="text-slate-500">Intake Time:</span> <span className="ml-2">{child.receivedDate}</span></div>
            <div><span className="text-slate-500">Current Placement:</span> <strong className="ml-2">{child.assignedDorm}</strong></div>
            <div><span className="text-slate-500">Medical Status:</span> <strong className="ml-2 text-teal-600">{child.medicalStatus}</strong></div>
          </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-3 shadow-md">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Police Coordination
          </h3>
          <div className="space-y-2 text-xs">
            <div><span className="text-slate-500">Police Station:</span> <strong className="ml-2">{child.policeStation}</strong></div>
            <div><span className="text-slate-500">Assigned Officer:</span> <strong className="ml-2">{child.assignedOfficer}</strong></div>
            <div><span className="text-slate-500">Verification Status:</span> <span className="ml-2 text-teal-600 font-semibold">{child.guardianVerificationStatus}</span></div>
          </div>
        </Card>
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
