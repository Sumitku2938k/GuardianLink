import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldAlert,
  MapPin,
  Clock,
  User,
  HeartPulse,
  PhoneCall,
  UserCheck,
  Cpu,
  FileText,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2
} from "lucide-react";

import { usePolice } from "@/context/PoliceContext";
import { CaseStatusBadge } from "@/components/missing/CaseStatusBadge";
import { CasePriorityBadge } from "@/components/missing/CasePriorityBadge";
import { CaseStatusTracker } from "@/components/missing/CaseStatusTracker";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { InvestigationNotesLog } from "@/components/police/InvestigationNotesLog";
import { AssignmentModal } from "@/components/police/AssignmentModal";
import { ChildTimeline } from "@/components/children/ChildTimeline";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

export default function PoliceCaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const {
    getCaseById,
    investigationNotes,
    updateCaseStatus,
    assignOfficer,
    addInvestigationNote
  } = usePolice();

  const caseData = getCaseById(caseId);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-white">Case Record Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">Case #{caseId} does not exist in police station database.</p>
        <Button onClick={() => navigate("/police/cases")} className="mt-4">
          Return to Cases
        </Button>
      </div>
    );
  }

  const notesList = investigationNotes[caseData.id] || [];

  return (
    <div className="space-y-6">
      {/* CASE HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 relative z-10">
          <img
            src={caseData.childPhoto}
            alt={caseData.childName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-blue-500/30 shadow-xl shrink-0"
          />

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-teal-300 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
                Case #{caseData.caseNumber}
              </span>
              <CaseStatusBadge status={caseData.status} />
              <CasePriorityBadge priority={caseData.priority} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">{caseData.childName}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {caseData.lastSeenLocation}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-teal-400" /> Lead: {caseData.assignedOfficerName}</span>
            </div>
          </div>
        </div>

        {/* Quick Officer Action Toolbar */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 relative z-10">
          <Button
            onClick={() => navigate(`/police/cases/${caseData.id}/investigation`)}
            variant="primary"
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex-1 sm:flex-initial"
            leftIcon={FileText}
          >
            Investigation Workspace
          </Button>

          <Button
            onClick={() => navigate(`/police/cases/${caseData.id}/matches`)}
            variant="glass"
            size="sm"
            className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 font-bold text-xs flex-1 sm:flex-initial"
            leftIcon={Cpu}
          >
            AI Matches (3)
          </Button>

          <Button
            onClick={() => setIsAssignModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-slate-700 text-slate-200 hover:bg-slate-800 flex-1 sm:flex-initial"
          >
            Reassign Officer
          </Button>
        </div>
      </div>

      {/* CASE STATUS PIPELINE TRACKER */}
      <CaseStatusTracker currentStageIndex={caseData.stageIndex || 4} />

      {/* GRID: MAIN CASE DOSSIER CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Child & Medical Info Card */}
          <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Authorized Child Profile Dossier</span>
              <span className="text-[10px] text-teal-400">Level 3 Clearance</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div><span className="text-slate-400 block">Age / Gender:</span> <strong className="text-white mt-0.5 block">{caseData.childAge} yrs • {caseData.childGender}</strong></div>
              <div><span className="text-slate-400 block">Height:</span> <strong className="text-white mt-0.5 block">{caseData.height}</strong></div>
              <div><span className="text-slate-400 block">Hair:</span> <strong className="text-white mt-0.5 block">{caseData.hair}</strong></div>
              <div><span className="text-slate-400 block">Distinctive Marks:</span> <strong className="text-white mt-0.5 block">{caseData.distinctiveMarks}</strong></div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" /> Sensitive Emergency Medical Info
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><span className="text-slate-400 block">Blood Group:</span> <strong className="text-white block mt-0.5">{caseData.bloodGroup}</strong></div>
                <div><span className="text-slate-400 block">Conditions:</span> <strong className="text-amber-400 block mt-0.5">{caseData.medicalConditions}</strong></div>
                <div><span className="text-slate-400 block">Allergies:</span> <strong className="text-white block mt-0.5">{caseData.allergies}</strong></div>
                <div><span className="text-slate-400 block">Medication:</span> <strong className="text-teal-300 block mt-0.5">{caseData.medication}</strong></div>
              </div>
            </div>
          </Card>

          {/* Last Seen & Map UI Card */}
          <Card className="p-6 bg-slate-900 border-slate-800 text-white space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
              Last Seen Sighting Coordinates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div><span className="text-slate-400">Date/Time:</span> <strong className="text-white block mt-0.5">{caseData.lastSeenDate} ({caseData.lastSeenTime})</strong></div>
              <div><span className="text-slate-400">Landmark:</span> <strong className="text-white block mt-0.5">{caseData.locationLandmark}</strong></div>
            </div>

            <MapPlaceholder
              locationName={caseData.lastSeenLocation}
              latitude="28.6139"
              longitude="77.2090"
            />
          </Card>

          {/* Internal Investigation Notes Log */}
          <Card className="p-6 bg-slate-900 border-slate-800 text-white">
            <InvestigationNotesLog
              caseId={caseData.id}
              notes={notesList}
              onAddNote={addInvestigationNote}
            />
          </Card>
        </div>

        {/* Right Column (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Verified Guardian Card */}
          <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Verified Guardian</span>
              <Badge variant="success" size="sm">Verified KYC</Badge>
            </div>

            <div className="space-y-1 text-xs">
              <strong className="text-white text-sm block">{caseData.guardianName}</strong>
              <span className="text-slate-400 block">{caseData.guardianRelation}</span>
              <a href={`tel:${caseData.guardianPhone}`} className="inline-block text-teal-400 font-bold hover:underline pt-1">
                📞 Call Guardian ({caseData.guardianPhone})
              </a>
            </div>
          </Card>

          {/* Evidence Files Card */}
          <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase block pb-2 border-b border-slate-800">
              Evidence & Documents
            </span>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <strong className="text-white block">{caseData.firNumber}</strong>
                  <span className="text-[10px] text-slate-400">Police FIR Document</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs">View</Button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <strong className="text-white block">CCTV Feed Segment #12</strong>
                  <span className="text-[10px] text-slate-400">Exit 4B Video Log</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs">View</Button>
              </div>
            </div>
          </Card>

          {/* Case Timeline History */}
          <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase block pb-2 border-b border-slate-800">
              Case Timeline Audit Log
            </span>
            <ChildTimeline events={[]} />
          </Card>
        </div>
      </div>

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedCase={caseData}
        onAssignConfirm={(cId, oId) => assignOfficer(cId, oId)}
      />
    </div>
  );
}
