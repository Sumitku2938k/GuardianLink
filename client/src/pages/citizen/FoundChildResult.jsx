import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, AlertCircle, FileText, RefreshCw, Share2 } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { MatchResultCard } from "@/components/citizen/MatchResultCard";
import { GuardianContactModal } from "@/components/citizen/GuardianContactModal";
import { Button } from "@/components/ui/Button";

export default function FoundChildResult() {
  const navigate = useNavigate();
  const { workflowSession, requestGuardianContact, runAIMatching } = useCitizen();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const candidate = workflowSession.matchedCandidate;
  const isMatchFound = workflowSession.aiResult === "match_found" && candidate;

  const handleForceNoMatch = () => {
    runAIMatching(true);
  };

  const handleForceMatch = () => {
    runAIMatching(false);
  };

  const handleSendContactRequest = () => {
    requestGuardianContact();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">AI Search Identification Result</h1>
          <p className="text-xs text-gray-500">Result of neural vector lookup against nationwide database.</p>
        </div>

        {/* Demo Switcher Toggle */}
        <div className="flex items-center gap-2">
          {isMatchFound ? (
            <Button onClick={handleForceNoMatch} variant="ghost" size="sm" className="text-[10px] text-gray-400">
              Demo: Simulate "No Match"
            </Button>
          ) : (
            <Button onClick={handleForceMatch} variant="ghost" size="sm" className="text-[10px] text-primary">
              Demo: Simulate "Match Found"
            </Button>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        {isMatchFound ? (
          <MatchResultCard
            candidate={candidate}
            onRequestContact={() => setIsModalOpen(true)}
            onShareLocation={() => navigate("/citizen/found-child/location")}
            onReportFallback={() => navigate("/citizen/found-child/report")}
          />
        ) : (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-amber-500/10">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">No Match Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                We couldn't identify the child right now. You can still help by submitting a Found Child Report for police & NGO review.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 text-xs text-gray-500 text-left space-y-1">
              <div>• The child may not be registered in the platform yet.</div>
              <div>• The photo may not have sufficient facial features visible.</div>
              <div>• Submitting a report queues the sighting for active police desk monitoring.</div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate("/citizen/found-child/report")}
                variant="primary"
                size="md"
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400 border-none"
                leftIcon={FileText}
              >
                Create Found Child Report
              </Button>

              <Button
                onClick={() => navigate("/citizen/found-child/photo")}
                variant="outline"
                size="md"
                leftIcon={RefreshCw}
              >
                Try Another Photo
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Guardian Contact Modal */}
      <GuardianContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidate={candidate}
        requestSent={workflowSession.contactRequestSent}
        requestStatus={workflowSession.contactRequestStatus}
        onRequestSend={handleSendContactRequest}
      />
    </div>
  );
}
