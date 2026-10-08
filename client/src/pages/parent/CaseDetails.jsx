import React, { useState } from "react";
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

          {/* Evidence & Documents */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-2 border-b border-gray-100 dark:border-slate-800">
              Evidence & Official Documents
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{caseData.firDocument || "FIR Report Copy.pdf"}</h4>
                    <span className="text-[10px] text-gray-400">Official Police Record</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadSummary} className="text-xs">
                  View
                </Button>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">AI Biometric Face Matrix</h4>
                    <span className="text-[10px] text-gray-400">12 Vector Points</span>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">Verified</Badge>
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
    </div>
  );
}
