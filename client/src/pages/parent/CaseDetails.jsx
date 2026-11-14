import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  MapPin,
  Clock,
  User,
  Users,
  AlertTriangle,
  Download,
  PhoneCall,
  Edit2,
  FileText,
  Lock,
  Plus,
  Eye,
  CheckCircle2,
  Share2,
  Compass,
  Cpu,
  ShieldCheck
} from "lucide-react";

import { useMissingCases } from "@/context/MissingCasesContext";
import { CaseStatusBadge } from "@/components/missing/CaseStatusBadge";
import { CasePriorityBadge } from "@/components/missing/CasePriorityBadge";
import { CaseStatusTracker } from "@/components/missing/CaseStatusTracker";
import { MapPlaceholder } from "@/components/missing/MapPlaceholder";
import { PotentialMatchCard } from "@/components/missing/PotentialMatchCard";
import { CitizenReportCard } from "@/components/missing/CitizenReportCard";
import { PoliceAssignmentCard } from "@/components/missing/PoliceAssignmentCard";
import { RecoveryConfirmationModal } from "@/components/missing/RecoveryConfirmationModal";
import { ChildTimeline } from "@/components/children/ChildTimeline";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

import {
  submitFIR,
  replaceFIRDocument,
  getCaseFIR,
  fetchDocumentPreviewBlob,
  downloadFIRDocument
} from "@/services/firService";
import { UploadCloud, FileCheck, XCircle, RefreshCw, FileText as FileIcon } from "lucide-react";

export default function CaseDetails() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const {
    getCaseById,
    findCaseInState,
    potentialMatches,
    citizenReports,
    caseTimelines,
    verifyMatch,
    closeCase
  } = useMissingCases();

  const [caseData, setCaseData] = useState(() => (findCaseInState ? findCaseInState(caseId) : null));
  const [loading, setLoading] = useState(!caseData);

  useEffect(() => {
    let isMounted = true;
    const fetchCurrentCase = async () => {
      try {
        const data = await getCaseById(caseId);
        if (isMounted) {
          setCaseData(data);
        }
      } catch (err) {
        console.error("Error loading case:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCurrentCase();
    return () => {
      isMounted = false;
    };
  }, [caseId, getCaseById]);

  // Modal States
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [activeMediaPreview, setActiveMediaPreview] = useState(null);

  // FIR Module States (Phase 18)
  const [firRecord, setFirRecord] = useState(null);
  const [firLoading, setFirLoading] = useState(true);
  const [isSubmitFIRModalOpen, setIsSubmitFIRModalOpen] = useState(false);
  const [isReplaceDocModalOpen, setIsReplaceDocModalOpen] = useState(false);
  const [isPreviewDocModalOpen, setIsPreviewDocModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewMimeType, setPreviewMimeType] = useState("application/pdf");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [firSubmitting, setFirSubmitting] = useState(false);
  const [firError, setFirError] = useState(null);

  // FIR Form State
  const [firFormData, setFirFormData] = useState({
    firNumber: "",
    policeStation: "",
    district: "",
    state: "",
    filingDate: new Date().toISOString().split("T")[0],
    incidentDate: "",
    sections: "",
    complainantName: "",
    relationship: "Parent",
    contactPhone: ""
  });
  const [firFile, setFirFile] = useState(null);

  // Replacement Form State
  const [replaceReason, setReplaceReason] = useState("");
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [replaceError, setReplaceError] = useState(null);

  const fetchFIR = async () => {
    try {
      setFirLoading(true);
      const data = await getCaseFIR(caseId);
      setFirRecord(data);
    } catch (err) {
      console.warn("Could not load FIR:", err);
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
    if (caseData) {
      setFirFormData((prev) => ({
        ...prev,
        policeStation: caseData.policeStationName || caseData.policeStation || "",
        complainantName: caseData.guardianName || "",
        contactPhone: caseData.guardianPhone || ""
      }));
    }
  }, [caseData]);

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
      setIsPreviewDocModalOpen(true);
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

  const handleSubmitFIR = async (e) => {
    e.preventDefault();
    if (!firFile) {
      setFirError("Please select an official FIR document file (PDF, JPEG, or PNG).");
      return;
    }
    if (!firFormData.firNumber.trim()) {
      setFirError("FIR Number is required.");
      return;
    }
    if (!firFormData.policeStation.trim()) {
      setFirError("Police Station is required.");
      return;
    }

    try {
      setFirSubmitting(true);
      setFirError(null);
      const data = new FormData();
      data.append("firNumber", firFormData.firNumber.trim());
      data.append("policeStation", firFormData.policeStation.trim());
      data.append("district", firFormData.district.trim());
      data.append("state", firFormData.state.trim());
      data.append("filingDate", firFormData.filingDate);
      if (firFormData.incidentDate) data.append("incidentDate", firFormData.incidentDate);
      if (firFormData.sections) data.append("sections", firFormData.sections);
      data.append("complainantName", firFormData.complainantName.trim());
      data.append("relationship", firFormData.relationship.trim());
      data.append("contactPhone", firFormData.contactPhone.trim());
      data.append("document", firFile);

      await submitFIR(caseId, data);
      await fetchFIR();
      setIsSubmitFIRModalOpen(false);
      setFirFile(null);
    } catch (err) {
      setFirError(err.response?.data?.message || err.message || "Failed to submit FIR.");
    } finally {
      setFirSubmitting(false);
    }
  };

  const handleReplaceDocument = async (e) => {
    e.preventDefault();
    if (!replaceFile) {
      setReplaceError("Please select the replacement document file.");
      return;
    }

    try {
      setReplaceSubmitting(true);
      setReplaceError(null);
      const data = new FormData();
      data.append("replacementReason", replaceReason.trim() || "Updated official FIR copy uploaded");
      data.append("document", replaceFile);

      await replaceFIRDocument(firRecord._id, data);
      await fetchFIR();
      setIsReplaceDocModalOpen(false);
      setReplaceFile(null);
      setReplaceReason("");
    } catch (err) {
      setReplaceError(err.response?.data?.message || err.message || "Failed to replace document.");
    } finally {
      setReplaceSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-medium">Loading emergency case profile...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Case Record Not Found</h3>
        <p className="text-xs text-gray-500 mt-1">This missing case does not exist or has been removed.</p>
        <Button onClick={() => navigate("/parent/missing-cases")} className="mt-4">
          Return to Missing Cases
        </Button>
      </div>
    );
  }

  const linkedMatches = potentialMatches.filter((m) => m.caseId === caseData.id || m.caseId === caseData.caseNumber);
  const linkedCitizenReports = citizenReports.filter((r) => r.caseId === caseData.id || r.caseId === caseData.caseNumber);
  const timelineEvents = caseTimelines[caseData.id] || caseTimelines[caseData.caseNumber] || [];

  const handleDownloadSummary = () => {
    alert(`Downloading Case Summary PDF for ${caseData.caseNumber}...`);
  };

  return (
    <div className="space-y-6">
      {/* CASE HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white border border-rose-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <img
            src={caseData.childPhoto}
            alt={caseData.childName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-rose-500/30 shadow-xl shrink-0"
          />

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-rose-300 border border-white/20">
                Case #{caseData.caseNumber}
              </span>
              <CaseStatusBadge status={caseData.status} />
              <CasePriorityBadge priority={caseData.priority} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">{caseData.childName}</h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {caseData.lastSeenLocation}</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> Reported: {caseData.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto shrink-0 relative z-10">
          <Button
            onClick={handleDownloadSummary}
            variant="glass"
            size="sm"
            leftIcon={Download}
            className="flex-1 sm:flex-initial text-xs bg-white/10 text-white"
          >
            Download Summary
          </Button>

          <Button
            onClick={() => setIsSupportModalOpen(true)}
            variant="glass"
            size="sm"
            leftIcon={PhoneCall}
            className="flex-1 sm:flex-initial text-xs bg-white/10 text-white"
          >
            Contact Support
          </Button>

          {caseData.status !== "Closed" && caseData.status !== "Recovered" && (
            <Button
              onClick={() => setIsRecoveryModalOpen(true)}
              variant="secondary"
              size="sm"
              leftIcon={ShieldCheck}
              className="flex-1 sm:flex-initial text-xs bg-teal-400 text-slate-950 font-bold hover:bg-teal-300"
            >
              Confirm Safe Recovery
            </Button>
          )}
        </div>
      </div>

      {/* STATUS TRACKER PIPELINE */}
      <CaseStatusTracker currentStageIndex={caseData.stageIndex || 4} />

      {/* LIVE LOCATION SHARED SECTION */}
      {caseData.liveLocationActive && (
        <Card className="p-5 bg-gradient-to-r from-teal-500/10 via-slate-900 to-teal-500/10 border-teal-500/30 text-gray-900 dark:text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
              <Compass className="w-5 h-5 animate-spin" />
              <span>LIVE LOCATION SHARING ACTIVE</span>
            </div>
            <Badge variant="secondary" pulse size="sm">
              Updated {caseData.lastLocationTimestamp}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Current Signal Location: <strong>{caseData.lastSharedLocation}</strong>
          </p>
        </Card>
      )}

      {/* GRID: MAIN CASE DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Main Details Column (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Child & Last Seen Info */}
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-primary" />
                <span>Child & Last Seen Information</span>
              </h3>
              <Link to={`/parent/children/${caseData.childId}`}>
                <Button variant="ghost" size="sm" className="text-xs text-primary font-bold">
                  View Child Profile →
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div><span className="text-gray-400 block">Age:</span> <strong className="text-gray-900 dark:text-white mt-0.5 block">{caseData.childAge} years</strong></div>
              <div><span className="text-gray-400 block">Gender:</span> <strong className="text-gray-900 dark:text-white mt-0.5 block">{caseData.childGender}</strong></div>
              <div><span className="text-gray-400 block">Height:</span> <strong className="text-gray-900 dark:text-white mt-0.5 block">{caseData.height}</strong></div>
              <div><span className="text-gray-400 block">Distinctive Marks:</span> <strong className="text-gray-900 dark:text-white mt-0.5 block">{caseData.distinctiveMarks || "None"}</strong></div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Last Seen Coordinates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-400">Date/Time:</span> <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{caseData.lastSeenDate} ({caseData.lastSeenTime})</p></div>
                <div><span className="text-gray-400">Landmark:</span> <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{caseData.locationLandmark}</p></div>
              </div>
              <MapPlaceholder
                locationName={caseData.lastSeenLocation}
                latitude={caseData.latitude}
                longitude={caseData.longitude}
              />
            </div>
          </Card>

          {/* Appearance & Circumstances */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Clothing & Event Circumstances
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div><span className="text-gray-400 block">Top:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{caseData.clothingTop}</strong></div>
              <div><span className="text-gray-400 block">Bottom:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{caseData.clothingBottom || "N/A"}</strong></div>
              <div><span className="text-gray-400 block">Shoes:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{caseData.clothingShoes || "N/A"}</strong></div>
              <div><span className="text-gray-400 block">Accessories:</span> <strong className="text-gray-900 dark:text-white block mt-0.5">{caseData.accessories || "N/A"}</strong></div>
            </div>

            <div className="pt-2 text-xs">
              <span className="text-gray-400 block">Circumstance Story & Notes:</span>
              <p className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-gray-800 dark:text-slate-200 mt-1 leading-relaxed">
                "{caseData.circumstances}"
              </p>
            </div>
          </Card>

          {/* Evidence & Official Documents */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Official FIR & Legal Evidence
                </h3>
                <p className="text-[11px] text-gray-500">Official police registration & biometric evidence trail</p>
              </div>
              {!firRecord && !firLoading && (
                <Button
                  size="sm"
                  onClick={() => setIsSubmitFIRModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> File Official FIR
                </Button>
              )}
            </div>

            {/* FIR Record Section */}
            {firLoading ? (
              <div className="p-4 text-center text-xs text-gray-400">Loading FIR status...</div>
            ) : firRecord ? (
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{firRecord.firNumber}</h4>
                        {firRecord.status === "verified" && (
                          <Badge variant="success" size="sm" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified by Police
                          </Badge>
                        )}
                        {firRecord.status === "pending_review" && (
                          <Badge variant="warning" size="sm" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Police Verification
                          </Badge>
                        )}
                        {firRecord.status === "rejected" && (
                          <Badge variant="danger" size="sm" className="flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Verification Rejected
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block">
                        Station: {firRecord.policeStation} • Filed: {new Date(firRecord.filingDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenPreview("latest")} className="text-xs flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Preview Document
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadFIR("latest")} className="text-xs flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                    {firRecord.status !== "verified" && (
                      <Button
                        size="sm"
                        onClick={() => setIsReplaceDocModalOpen(true)}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center gap-1 font-bold"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Replace Document
                      </Button>
                    )}
                  </div>
                </div>

                {/* Additional FIR metadata details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] border-t border-gray-200 dark:border-slate-800/80">
                  <div>
                    <span className="text-gray-400 block">Jurisdiction:</span>
                    <strong className="text-gray-800 dark:text-slate-200">{firRecord.district}, {firRecord.state}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Complainant:</span>
                    <strong className="text-gray-800 dark:text-slate-200">{firRecord.complainantName} ({firRecord.relationship})</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Active Version:</span>
                    <strong className="text-gray-800 dark:text-slate-200">v{firRecord.activeDocument?.version || 1} ({firRecord.activeDocument?.fileExtension?.toUpperCase()})</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Checksum (SHA-256):</span>
                    <span className="font-mono text-[9px] text-gray-500 truncate block" title={firRecord.activeDocument?.sha256Checksum}>
                      {firRecord.activeDocument?.sha256Checksum?.slice(0, 14)}...
                    </span>
                  </div>
                </div>

                {/* Status Notice Boxes */}
                {firRecord.status === "verified" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <strong className="font-bold block">Officer Review Note:</strong>
                    <span>{firRecord.latestReviewNotes || "Document has been verified and authenticated against station records."}</span>
                  </div>
                )}

                {firRecord.status === "rejected" && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Document Rejected by Law Enforcement</span>
                    </div>
                    <p><strong>Reason:</strong> {firRecord.latestRejectionReason || "Details inconsistent or document illegible."}</p>
                    {firRecord.latestReviewNotes && (
                      <p><strong>Officer Review Notes:</strong> {firRecord.latestReviewNotes}</p>
                    )}
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1">
                      Please upload a clear, legible official copy with station seal and officer signature using "Replace Document" above.
                    </p>
                  </div>
                )}

                {firRecord.status === "pending_review" && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                    <span>This FIR document is currently queued for official review by assigned police officers. You will receive an immediate in-app alert upon verification.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800 text-center space-y-2 bg-gray-50/50 dark:bg-slate-900/30">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">No Official Police FIR Recorded Yet</h4>
                <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                  Uploading an official FIR document from your local police station confirms case authenticity and enables inter-agency law enforcement coordination across state borders.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsSubmitFIRModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs mt-2"
                >
                  <Plus className="w-4 h-4" /> Submit Official FIR Copy
                </Button>
              </div>
            )}

            {/* AI Biometric & System Evidence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">AI Biometric Face Matrix</h4>
                    <span className="text-[10px] text-gray-400">512-D InsightFace Vector</span>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">Active</Badge>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Immutable Security Audit</h4>
                    <span className="text-[10px] text-gray-400">Cryptographic Activity Trail</span>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">Audited</Badge>
              </div>
            </div>
          </Card>

          {/* Potential AI Matches Section */}
          {linkedMatches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-500" />
                <span>Potential AI Matches ({linkedMatches.length})</span>
              </h3>
              <div className="space-y-4">
                {linkedMatches.map((m) => (
                  <PotentialMatchCard key={m.id} match={m} onVerify={(id) => verifyMatch(caseData.id, id)} />
                ))}
              </div>
            </div>
          )}

          {/* Citizen Sightings Section */}
          {linkedCitizenReports.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-500" />
                <span>Verified Citizen Sighting Reports ({linkedCitizenReports.length})</span>
              </h3>
              <div className="space-y-4">
                {linkedCitizenReports.map((r) => (
                  <CitizenReportCard key={r.id} report={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column Widgets (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Police Assignment Card */}
          <PoliceAssignmentCard caseData={caseData} />

          {/* Case Timeline Log */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Case Timeline History
            </h3>
            <ChildTimeline events={timelineEvents} />
          </Card>
        </div>
      </div>

      {/* Support Contact Modal */}
      <Modal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        title="Contact Authorized Case Support"
        subtitle="24/7 Priority Emergency Channel"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600 dark:text-gray-300">
            For critical updates regarding Case <strong>#{caseData.caseNumber}</strong>, connect directly with verified officers or GuardianLink emergency support.
          </p>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 space-y-2 border">
            <h4 className="font-bold text-gray-900 dark:text-white">Assigned Police Desk</h4>
            <p className="text-gray-500">{caseData.policeStationName}</p>
            <a href={`tel:${caseData.policeContact}`} className="inline-block pt-1 font-bold text-primary hover:underline">
              📞 Call Officer ({caseData.policeContact})
            </a>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 space-y-2 border">
            <h4 className="font-bold text-gray-900 dark:text-white">Childline Hotline</h4>
            <p className="text-gray-500">24/7 National Emergency Helpline</p>
            <a href="tel:1098" className="inline-block pt-1 font-bold text-teal-500 hover:underline">
              📞 Call 1098
            </a>
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsSupportModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Case Recovery Confirmation Modal */}
      <RecoveryConfirmationModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        caseData={caseData}
        onConfirmClose={(id, details) => closeCase(id, details)}
      />

      {/* 1. Official FIR Submission Modal */}
      <Modal
        isOpen={isSubmitFIRModalOpen}
        onClose={() => {
          if (!firSubmitting) setIsSubmitFIRModalOpen(false);
        }}
        title="Submit Official Police FIR Document"
        subtitle={`Case #${caseData.caseNumber} • ${caseData.childName}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitFIR} className="space-y-4 text-xs">
          {firError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium">
              {firError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                FIR Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firFormData.firNumber}
                onChange={(e) => setFirFormData({ ...firFormData, firNumber: e.target.value })}
                placeholder="e.g. FIR-2026-0891"
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                Police Station <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firFormData.policeStation}
                onChange={(e) => setFirFormData({ ...firFormData, policeStation: e.target.value })}
                placeholder="e.g. Connaught Place Police Station"
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                District <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firFormData.district}
                onChange={(e) => setFirFormData({ ...firFormData, district: e.target.value })}
                placeholder="e.g. Central Delhi"
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firFormData.state}
                onChange={(e) => setFirFormData({ ...firFormData, state: e.target.value })}
                placeholder="e.g. Delhi"
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                FIR Filing Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().split("T")[0]}
                value={firFormData.filingDate}
                onChange={(e) => setFirFormData({ ...firFormData, filingDate: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                Incident Date
              </label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={firFormData.incidentDate}
                onChange={(e) => setFirFormData({ ...firFormData, incidentDate: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                Complainant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firFormData.complainantName}
                onChange={(e) => setFirFormData({ ...firFormData, complainantName: e.target.value })}
                placeholder="Parent/Guardian Full Name"
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
                Relationship <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firFormData.relationship}
                onChange={(e) => setFirFormData({ ...firFormData, relationship: e.target.value })}
                placeholder="e.g. Father, Mother, Legal Guardian"
                className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
              Contact Phone <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={firFormData.contactPhone}
              onChange={(e) => setFirFormData({ ...firFormData, contactPhone: e.target.value })}
              placeholder="e.g. +91 9876543210"
              className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
              Attach Official FIR Scanned Copy <span className="text-rose-500">*</span>
            </label>
            <div className="p-4 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-2xl text-center bg-gray-50/50 dark:bg-slate-900/30">
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                id="fir-file-upload"
                onChange={(e) => setFirFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="fir-file-upload" className="cursor-pointer block space-y-2">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-5 h-5" />
                </div>
                {firFile ? (
                  <div className="text-xs">
                    <p className="font-bold text-gray-900 dark:text-white">{firFile.name}</p>
                    <p className="text-[10px] text-gray-400">{(firFile.size / 1024).toFixed(1)} KB • Click to choose another</p>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="font-bold text-rose-600 dark:text-rose-400">Click to choose official FIR file</p>
                    <p className="text-[10px] text-gray-400">PDF, JPEG, or PNG format • Maximum size 10MB</p>
                  </div>
                )}
              </label>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              All documents are cryptographically verified and stored in an isolated private vault accessible only to authorized law enforcement officers.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitFIRModalOpen(false)}
              isDisabled={firSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={firSubmitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Submit FIR for Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Replace Document Modal */}
      <Modal
        isOpen={isReplaceDocModalOpen}
        onClose={() => {
          if (!replaceSubmitting) setIsReplaceDocModalOpen(false);
        }}
        title="Replace FIR Document (Upload New Version)"
        subtitle={`FIR #${firRecord?.firNumber || ""} • Case #${caseData.caseNumber}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReplaceDocument} className="space-y-4 text-xs">
          {replaceError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium">
              {replaceError}
            </div>
          )}

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Upload an updated copy of the official FIR document. The system will archive the previous version and automatically reset the verification status to <strong>Pending Police Review</strong>.
          </p>

          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
              Reason for Replacement / Corrections
            </label>
            <input
              type="text"
              required
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
              placeholder="e.g. Scanned with official seal, high-resolution re-upload"
              className="w-full py-2 px-3 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-900 dark:text-white outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 block mb-1">
              Select New Document File <span className="text-rose-500">*</span>
            </label>
            <div className="p-4 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-2xl text-center bg-gray-50/50 dark:bg-slate-900/30">
              <input
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                id="replace-file-upload"
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="replace-file-upload" className="cursor-pointer block space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-5 h-5" />
                </div>
                {replaceFile ? (
                  <div className="text-xs">
                    <p className="font-bold text-gray-900 dark:text-white">{replaceFile.name}</p>
                    <p className="text-[10px] text-gray-400">{(replaceFile.size / 1024).toFixed(1)} KB • Click to change</p>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="font-bold text-amber-600 dark:text-amber-400">Select replacement document</p>
                    <p className="text-[10px] text-gray-400">PDF, JPEG, or PNG • Max 10MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReplaceDocModalOpen(false)}
              isDisabled={replaceSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={replaceSubmitting}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              Upload & Request Review
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Document Preview Modal */}
      <Modal
        isOpen={isPreviewDocModalOpen}
        onClose={() => setIsPreviewDocModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-500" />
            <span>FIR Document Preview • {firRecord?.firNumber || ""}</span>
          </div>
        }
        subtitle={`${firRecord?.activeDocument?.originalFilename || "FIR Document"} (v${firRecord?.activeDocument?.version || 1})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading document stream from private storage...</p>
            </div>
          ) : previewError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
              <p className="font-bold">Error Previewing Document</p>
              <p>{previewError}</p>
            </div>
          ) : previewBlobUrl ? (
            <div className="w-full bg-slate-950 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
              {previewMimeType.includes("pdf") ? (
                <iframe
                  src={previewBlobUrl}
                  title="Official FIR Document Preview"
                  className="w-full h-[540px] border-0"
                />
              ) : (
                <div className="p-4 flex items-center justify-center min-h-[400px]">
                  <img
                    src={previewBlobUrl}
                    alt="Official FIR Document"
                    className="max-h-[500px] max-w-full rounded-lg object-contain shadow-md"
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-800 text-xs">
            <span className="text-gray-400">
              {firRecord?.activeDocument?.fileSizeBytes
                ? `${(firRecord.activeDocument.fileSizeBytes / 1024).toFixed(1)} KB • Protected Document Stream`
                : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownloadFIR("latest")}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download Copy
              </Button>
              <Button size="sm" onClick={() => setIsPreviewDocModalOpen(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
