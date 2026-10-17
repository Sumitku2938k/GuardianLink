/**
 * GuardianLink — Found Child Real Search Results (Phase 6.10)
 *
 * Renders real backend search results without demo simulations:
 * - Displays all eligible candidates with strict "Potential Match" uncertainty notice
 * - Renders clean, neutral no-eligible-matches state
 * - Provides immediate actions to share location, submit sighting report, or retry
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  FileText,
  RefreshCw,
  Share2,
  Sparkles
} from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { MatchResultCard } from "@/components/citizen/MatchResultCard";
import { GuardianContactModal } from "@/components/citizen/GuardianContactModal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function FoundChildResult() {
  const navigate = useNavigate();
  const { workflowSession, requestGuardianContact } = useCitizen();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const candidates = workflowSession.candidates || (workflowSession.matchedCandidate ? [workflowSession.matchedCandidate] : []);
  const hasCandidates = candidates.length > 0 && workflowSession.aiResult === "match_found";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>Biometric Identification Result</span>
            {hasCandidates && (
              <Badge variant="warning" size="sm">
                {candidates.length} Potential Match{candidates.length > 1 ? "es" : ""}
              </Badge>
            )}
          </h1>
          <p className="text-xs text-gray-500">
            Facial similarity lookup against authoritative active missing child cases nationwide.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/citizen/found-child/photo")}
          leftIcon={RefreshCw}
          className="text-xs"
        >
          New Photo
        </Button>
      </div>

      {/* Uncertainty Advisory Notice */}
      <div
        role="region"
        aria-label="Public Safety Advisory"
        className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5"
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Notice:</strong> An AI similarity match is a potential lead, not verified identity or proof that a child is missing. Never confront anyone based solely on this result.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {hasCandidates ? (
          candidates.map((cand, idx) => (
            <MatchResultCard
              key={cand.candidateId || idx}
              candidate={cand}
              onRequestContact={() => setIsModalOpen(true)}
              onShareLocation={() => navigate("/citizen/found-child/location")}
              onReportSighting={() => navigate("/citizen/found-child/report")}
            />
          ))
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-teal-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                No Eligible Potential Matches Found
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                No active, disclosable missing child cases matched the submitted photograph above the required threshold.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 text-xs text-gray-500 text-left space-y-1.5 max-w-lg mx-auto">
              <div className="font-bold text-gray-700 dark:text-gray-300">
                Next Steps to Help:
              </div>
              <div>• This does not prove the child is not missing; a report may not yet have been filed.</div>
              <div>• The photograph angle or lighting may have varied.</div>
              <div>• Submitting an official Sighting Report queues the details for law enforcement desk review.</div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate("/citizen/found-child/report")}
                variant="primary"
                size="md"
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none"
                leftIcon={FileText}
              >
                Create Sighting Report
              </Button>

              <Button
                onClick={() => navigate("/citizen/found-child/photo")}
                variant="outline"
                size="md"
                leftIcon={RefreshCw}
              >
                Try Another Photograph
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Guardian Contact Modal */}
      {workflowSession.matchedCandidate && (
        <GuardianContactModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          candidate={workflowSession.matchedCandidate}
          requestSent={workflowSession.contactRequestSent}
          requestStatus={workflowSession.contactRequestStatus}
          onRequestSend={requestGuardianContact}
        />
      )}
    </div>
  );
}
