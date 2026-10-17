/**
 * GuardianLink — Found Child Matching Processing Page (Phase 6.10)
 *
 * Real Backend Integration:
 * - Executes actual biometric search via runAIMatching()
 * - Replaces hardcoded Kabir Mehta simulation
 * - Displays active scanning feedback and forwards real candidates to results
 * - Displays actionable error feedback on network/AI failure
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { AIProcessingCard } from "@/components/citizen/AIProcessingCard";
import { Button } from "@/components/ui/Button";

export default function FoundChildMatching() {
  const navigate = useNavigate();
  const { workflowSession, runAIMatching } = useCitizen();

  const [matchingError, setMatchingError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!workflowSession.photoUrl && !workflowSession.photoFile) {
      navigate("/citizen/found-child/photo");
      return;
    }

    if (!hasTriggeredRef.current && !isProcessing) {
      hasTriggeredRef.current = true;
      executeBackendMatch();
    }
  }, [workflowSession.photoUrl, workflowSession.photoFile]);

  const executeBackendMatch = async () => {
    setIsProcessing(true);
    setMatchingError(null);

    try {
      await runAIMatching();
      navigate("/citizen/found-child/result");
    } catch (err) {
      console.error("AI matching failed:", err);
      setMatchingError(err.message || "Failed to complete biometric matching.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      {matchingError ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-xl text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto ring-8 ring-rose-500/10">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Biometric Search Could Not Be Completed
            </h2>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mx-auto leading-relaxed">
              {matchingError}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <Button
              onClick={executeBackendMatch}
              variant="primary"
              size="md"
              leftIcon={RefreshCw}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold hover:from-teal-400 hover:to-emerald-400"
            >
              Retry Matching
            </Button>

            <Button
              onClick={() => navigate("/citizen/found-child/photo")}
              variant="outline"
              size="md"
              leftIcon={ArrowLeft}
            >
              Choose Another Photo
            </Button>
          </div>
        </motion.div>
      ) : (
        <AIProcessingCard
          photoUrl={workflowSession.photoUrl}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
