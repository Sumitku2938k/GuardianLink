import React, { useState, useEffect } from "react";
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
  Share2,
  Edit3
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
    fetchCaseDetails,
    investigationNotes,
    updateCaseStatus,
    updateInvestigationDetails,
    assignOfficer,
    addInvestigationNote,
    isLoading: contextLoading
  } = usePolice();

  const caseData = getCaseById(caseId);
  const [loading, setLoading] = useState(!caseData);
  const [fetchError, setFetchError] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isFirModalOpen, setIsFirModalOpen] = useState(false);

  // Form states for FIR & Investigation Details
  const [firForm, setFirForm] = useState({
    firNumber: "",
    policeCaseNumber: "",
    priority: "High"
  });
  const [selectedNewStatus, setSelectedNewStatus] = useState("Investigating");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    if (!caseData && caseId) {
      setLoading(true);
      fetchCaseDetails(caseId)
        .then(() => {
          setLoading(false);
        })
        .catch((err) => {
          setFetchError(err.message || "Failed to load case");
          setLoading(false);
        });
    } else if (caseData) {
      setLoading(false);
      setFirForm({
        firNumber: caseData.firNumber || "",
        policeCaseNumber: caseData.policeCaseNumber || "",
        priority: caseData.priority || "High"
      });
      setSelectedNewStatus(caseData.status || "Investigating");
    }
  }, [caseId, caseData, fetchCaseDetails]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading case record #{caseId}...</span>
      </div>
    );
  }

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

  const handleSaveInvestigationDetails = async (e) => {
    e.preventDefault();
    setIsSavingDetails(true);
    setActionMessage(null);
    try {
      await updateInvestigationDetails(caseData.id, firForm);
      setIsFirModalOpen(false);
      setActionMessage({ type: "success", text: "FIR and Police Case details updated successfully." });
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Failed to update investigation records." });
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setIsSavingStatus(true);
    setActionMessage(null);
    try {
      await updateCaseStatus(caseData.id, selectedNewStatus);
      setIsStatusModalOpen(false);
      setActionMessage({ type: "success", text: `Case status transitioned to ${selectedNewStatus}.` });
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Status transition rejected by server rules." });
    } finally {
      setIsSavingStatus(false);
    }
  };

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
            AI Matches
          </Button>

          <Button
            onClick={() => setIsFirModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-slate-700 text-teal-300 hover:bg-slate-800 flex-1 sm:flex-initial"
            leftIcon={Edit3}
          >
            Edit FIR & Details
          </Button>

          <Button
            onClick={() => setIsStatusModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-slate-700 text-amber-300 hover:bg-slate-800 flex-1 sm:flex-initial"
          >
            Update Status
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

      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

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

      {/* Edit FIR & Police Details Modal */}
      <Modal
        isOpen={isFirModalOpen}
        onClose={() => setIsFirModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-teal-400">
            <Edit3 className="w-5 h-5" />
            <span>Update Police Case & FIR Records</span>
          </div>
        }
        subtitle={`Case #${caseData.caseNumber} • ${caseData.childName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveInvestigationDetails} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block mb-1">
              Police Case Number
            </label>
            <input
              type="text"
              value={firForm.policeCaseNumber}
              onChange={(e) => setFirForm({ ...firForm, policeCaseNumber: e.target.value })}
              placeholder="e.g. POL-2026-DEL-0941"
              className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block mb-1">
              Official FIR Number
            </label>
            <input
              type="text"
              value={firForm.firNumber}
              onChange={(e) => setFirForm({ ...firForm, firNumber: e.target.value })}
              placeholder="e.g. FIR-2026-DL-88219"
              className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block mb-1">
              Case Operational Priority
            </label>
            <select
              value={firForm.priority}
              onChange={(e) => setFirForm({ ...firForm, priority: e.target.value })}
              className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 outline-none"
            >
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsFirModalOpen(false)} isDisabled={isSavingDetails}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingDetails}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
            >
              Save Police Records
            </Button>
          </div>
        </form>
      </Modal>

      {/* Case Status Lifecycle Transition Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <span>Case Lifecycle Status Transition</span>
          </div>
        }
        subtitle={`Current Status: ${caseData.status} • Case #${caseData.caseNumber}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Select the new operational lifecycle status for this case. Transitions must follow the authorized police investigation workflow.
          </p>

          <div>
            <label className="text-[11px] font-mono text-slate-400 font-bold uppercase block mb-1">
              Target Status
            </label>
            <select
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value)}
              className="w-full py-2.5 px-3.5 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-blue-500 outline-none font-bold"
            >
              <option value="Investigating">Investigating (Active Investigation)</option>
              <option value="Under Review">Under Review (Verification in progress)</option>
              <option value="Found">Found (Child physically located & secured)</option>
              <option value="Closed">Closed (Case officially resolved)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsStatusModalOpen(false)} isDisabled={isSavingStatus}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingStatus}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              Apply Status Transition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
