import React, { useState, useEffect, useMemo } from "react";
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
import { LocationDisplay } from "@/components/common/map/LocationDisplay";
import { InvestigationNotesLog } from "@/components/police/InvestigationNotesLog";
import { AssignmentModal } from "@/components/police/AssignmentModal";
import { ChildTimeline } from "@/components/children/ChildTimeline";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

import {
  getCaseFIR,
  verifyFIR,
  rejectFIR,
  fetchDocumentPreviewBlob,
  downloadFIRDocument
} from "@/services/firService";
import { getInvestigationMapData } from "@/services/policeService";
import { Eye, CheckCircle, XCircle, RefreshCw, ShieldCheck } from "lucide-react";

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

  // Location & Investigation Map Intelligence (Phase 19)
  const [mapData, setMapData] = useState(null);

  useEffect(() => {
    if (caseId) {
      getInvestigationMapData(caseId)
        .then((data) => setMapData(data))
        .catch((err) => console.warn("[PoliceCaseDetails] Map data load error:", err.message));
    }
  }, [caseId]);

  const mapMarkers = useMemo(() => {
    const list = [];
    if (mapData?.case?.lastSeenLocation?.latitude) {
      list.push({
        id: `case-${mapData.case.id}`,
        latitude: Number(mapData.case.lastSeenLocation.latitude),
        longitude: Number(mapData.case.lastSeenLocation.longitude),
        type: "child",
        title: `${mapData.case.childName || caseData?.childName || "Child"} (Last Seen)`,
        subtitle: `Case #${mapData.case.caseNumber || caseData?.caseNumber}`,
        address: mapData.case.lastSeenLocation.address,
        date: mapData.case.missingDate,
        accuracy: mapData.case.lastSeenLocation.accuracy
      });
    } else if (caseData?.latitude && caseData?.longitude) {
      list.push({
        id: `case-${caseData.id}`,
        latitude: Number(caseData.latitude),
        longitude: Number(caseData.longitude),
        type: "child",
        title: `${caseData.childName} (Last Seen)`,
        subtitle: `Case #${caseData.caseNumber}`,
        address: caseData.lastSeenLocation,
        date: caseData.lastSeenDate,
        accuracy: caseData.accuracy
      });
    }

    if (mapData?.sightings && mapData.sightings.length > 0) {
      mapData.sightings.forEach((s) => {
        if (s.location?.latitude && s.location?.longitude) {
          list.push({
            id: `sighting-${s.id}`,
            latitude: Number(s.location.latitude),
            longitude: Number(s.location.longitude),
            type: "sighting",
            title: `Sighting Report (${s.status.toUpperCase()})`,
            subtitle: s.description || "Citizen Sighting",
            address: s.location.address,
            date: s.sightingDate,
            accuracy: s.location.accuracy
          });
        }
      });
    }
    return list;
  }, [mapData, caseData]);

  // FIR Module States (Phase 18)
  const [firRecord, setFirRecord] = useState(null);
  const [firLoading, setFirLoading] = useState(true);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewMimeType, setPreviewMimeType] = useState("application/pdf");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("Illegible Document Scan");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  const fetchFIR = async () => {
    try {
      setFirLoading(true);
      const data = await getCaseFIR(caseId);
      setFirRecord(data);
    } catch (err) {
      console.warn("Could not load FIR for police view:", err);
    } finally {
      setFirLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchFIR();
    }
  }, [caseId]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const handleOpenPreview = async (version = "latest") => {
    if (!firRecord) return;
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      setIsPreviewModalOpen(true);
      const { objectUrl, mimeType } = await fetchDocumentPreviewBlob(firRecord._id, version);
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(objectUrl);
      setPreviewMimeType(mimeType);
    } catch (err) {
      setPreviewError(err.response?.data?.message || err.message || "Failed to load document preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadFIR = async (version = "latest") => {
    if (!firRecord) return;
    try {
      const filename = firRecord.activeDocument?.originalFilename || `FIR_${firRecord.firNumber}.pdf`;
      await downloadFIRDocument(firRecord._id, version, filename);
    } catch (err) {
      alert("Failed to download document: " + (err.response?.data?.message || err.message));
    }
  };

  const handleConfirmVerify = async (e) => {
    e.preventDefault();
    if (!verifyNotes.trim() || verifyNotes.trim().length < 5) {
      setReviewError("Detailed officer review notes (at least 5 characters) are mandatory.");
      return;
    }
    try {
      setIsReviewSubmitting(true);
      setReviewError(null);
      await verifyFIR(firRecord._id, { reviewNotes: verifyNotes.trim() });
      await fetchFIR();
      setIsVerifyModalOpen(false);
      setVerifyNotes("");
      setActionMessage({ type: "success", text: `FIR ${firRecord.firNumber} officially verified.` });
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || "Failed to verify FIR");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setReviewError("A specific rejection reason (at least 5 characters) is required.");
      return;
    }
    if (!rejectNotes.trim() || rejectNotes.trim().length < 5) {
      setReviewError("Officer review notes (at least 5 characters) are mandatory.");
      return;
    }
    try {
      setIsReviewSubmitting(true);
      setReviewError(null);
      await rejectFIR(firRecord._id, {
        reviewNotes: rejectNotes.trim(),
        rejectionReason: rejectReason.trim()
      });
      await fetchFIR();
      setIsRejectModalOpen(false);
      setRejectNotes("");
      setActionMessage({ type: "success", text: `FIR ${firRecord.firNumber} rejected with review notes sent to guardian.` });
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || "Failed to reject FIR");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

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

            <LocationDisplay
              markers={mapMarkers}
              location={
                mapMarkers.length === 0
                  ? {
                      latitude: caseData.latitude,
                      longitude: caseData.longitude,
                      address: caseData.lastSeenLocation,
                      type: "child",
                      title: `${caseData.childName} (Last Seen)`
                    }
                  : null
              }
              height="320px"
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

          {/* Official FIR Verification Dossier Card */}
          <Card className="p-5 bg-slate-900 border-slate-800 text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  Official FIR Verification
                </span>
              </div>
              {firRecord && (
                firRecord.status === "verified" ? (
                  <Badge variant="success" size="sm">Verified</Badge>
                ) : firRecord.status === "rejected" ? (
                  <Badge variant="danger" size="sm">Rejected</Badge>
                ) : (
                  <Badge variant="warning" size="sm">Pending Review</Badge>
                )
              )}
            </div>

            {firLoading ? (
              <p className="text-xs text-slate-400 text-center py-2">Loading FIR status...</p>
            ) : firRecord ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-white text-sm block font-mono">{firRecord.firNumber}</strong>
                      <span className="text-[11px] text-slate-400">{firRecord.policeStation}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-900 text-teal-400 px-2 py-0.5 rounded border border-slate-800">
                      v{firRecord.activeDocument?.version || 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div>
                      <span>Filed:</span> <strong className="text-slate-200">{new Date(firRecord.filingDate).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span>Complainant:</span> <strong className="text-slate-200">{firRecord.complainantName}</strong>
                    </div>
                    <div>
                      <span>Contact:</span> <strong className="text-slate-200">{firRecord.contactPhone}</strong>
                    </div>
                    <div>
                      <span>Format:</span> <strong className="text-slate-200">{firRecord.activeDocument?.fileExtension?.toUpperCase()} ({(firRecord.activeDocument?.fileSizeBytes / 1024).toFixed(0)} KB)</strong>
                    </div>
                  </div>

                  {firRecord.activeDocument?.sha256Checksum && (
                    <div className="text-[9px] font-mono text-slate-500 truncate pt-1" title={firRecord.activeDocument.sha256Checksum}>
                      SHA-256: {firRecord.activeDocument.sha256Checksum}
                    </div>
                  )}
                </div>

                {/* Status Notice & Review Outcome */}
                {firRecord.status === "verified" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verified by Law Enforcement</span>
                    </div>
                    <p className="text-[11px] text-emerald-400">Notes: "{firRecord.latestReviewNotes || 'Verified authentic against police records.'}"</p>
                  </div>
                )}

                {firRecord.status === "rejected" && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Document Rejected</span>
                    </div>
                    <p className="text-[11px]"><strong>Reason:</strong> {firRecord.latestRejectionReason}</p>
                    <p className="text-[11px]"><strong>Notes:</strong> {firRecord.latestReviewNotes}</p>
                  </div>
                )}

                {/* Document Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => handleOpenPreview("latest")} className="text-xs flex items-center gap-1 flex-1">
                    <Eye className="w-3.5 h-3.5" /> Inspect Document
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadFIR("latest")} className="text-xs flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                </div>

                {/* Verification Decision Buttons for Pending FIRs */}
                {firRecord.status === "pending_review" && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">Pending Verification Action:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setReviewError(null); setIsVerifyModalOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Verify FIR
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setReviewError(null); setIsRejectModalOpen(true); }}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Reject FIR
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1 text-xs">
                <span className="text-slate-400 block">No FIR document on record.</span>
                <span className="text-[10px] text-slate-500 block">The parent has not yet uploaded an official scanned FIR for this case.</span>
              </div>
            )}
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

      {/* 1. Police Verify FIR Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          if (!isReviewSubmitting) setIsVerifyModalOpen(false);
        }}
        title={
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span>Official Police FIR Verification</span>
          </div>
        }
        subtitle={`FIR #${firRecord?.firNumber || ""} • ${firRecord?.policeStation || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmVerify} className="space-y-4 text-xs">
          {reviewError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
              {reviewError}
            </div>
          )}

          <p className="text-slate-300 leading-relaxed">
            You are verifying official FIR <strong>{firRecord?.firNumber}</strong> filed by <strong>{firRecord?.complainantName}</strong>. This confirms that the document matches station records and authenticates the case.
          </p>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Document Version:</span>
              <span className="text-white font-mono">v{firRecord?.activeDocument?.version || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SHA-256 Checksum:</span>
              <span className="text-teal-400 font-mono text-[9px]">{firRecord?.activeDocument?.sha256Checksum?.slice(0, 16)}...</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-300 font-bold uppercase block mb-1">
              Officer Review Notes <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="e.g. Cross-referenced with Station General Diary #402. Document authentic with official seal and signature."
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsVerifyModalOpen(false)}
              isDisabled={isReviewSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isReviewSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Confirm Official Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Police Reject FIR Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (!isReviewSubmitting) setIsRejectModalOpen(false);
        }}
        title={
          <div className="flex items-center gap-2 text-rose-400">
            <XCircle className="w-5 h-5" />
            <span>Reject Official FIR Document</span>
          </div>
        }
        subtitle={`FIR #${firRecord?.firNumber || ""} • ${firRecord?.policeStation || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
          {reviewError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
              {reviewError}
            </div>
          )}

          <p className="text-slate-300 leading-relaxed">
            Rejecting this document will notify the parent in real time with your rejection reason and review notes, prompting them to upload a corrected copy.
          </p>

          <div>
            <label className="text-[11px] font-mono text-slate-300 font-bold uppercase block mb-1">
              Rejection Reason <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-rose-500 outline-none"
            >
              <option value="Illegible Document Scan">Illegible Document Scan</option>
              <option value="Missing Official Station Seal or Officer Signature">Missing Official Station Seal or Officer Signature</option>
              <option value="Station / Jurisdiction Mismatch">Station / Jurisdiction Mismatch</option>
              <option value="Inconsistent Child or Complainant Details">Inconsistent Child or Complainant Details</option>
              <option value="Document Incomplete or Missing Pages">Document Incomplete or Missing Pages</option>
              <option value="Other Inconsistency Identified">Other Inconsistency Identified</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-300 font-bold uppercase block mb-1">
              Officer Review Notes for Guardian <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Explain clearly why this document was rejected so the guardian can obtain and upload the correct copy."
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-900 text-white border border-slate-800 focus:border-rose-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
              isDisabled={isReviewSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isReviewSubmitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Reject Document & Notify Guardian
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Police Document Inspection Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>FIR Document Inspection • {firRecord?.firNumber || ""}</span>
          </div>
        }
        subtitle={`${firRecord?.activeDocument?.originalFilename || "FIR Document"} (v${firRecord?.activeDocument?.version || 1})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading document stream from private storage...</p>
            </div>
          ) : previewError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <p className="font-bold">Error Previewing Document</p>
              <p>{previewError}</p>
            </div>
          ) : previewBlobUrl ? (
            <div className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
              {previewMimeType.includes("pdf") ? (
                <iframe
                  src={previewBlobUrl}
                  title="Police FIR Document Preview"
                  className="w-full h-[540px] border-0"
                />
              ) : (
                <div className="p-4 flex items-center justify-center min-h-[400px]">
                  <img
                    src={previewBlobUrl}
                    alt="Official FIR Document"
                    className="max-h-[500px] max-w-full rounded-lg object-contain"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>
              {firRecord?.activeDocument?.fileSizeBytes
                ? `${(firRecord.activeDocument.fileSizeBytes / 1024).toFixed(1)} KB • Private Vault Storage`
                : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownloadFIR("latest")}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download File
              </Button>
              <Button size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
